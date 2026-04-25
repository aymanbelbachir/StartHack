import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { isStayActive } from '@/lib/parseInvoice';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

const TOKEN_PACKS = [
  { tokens: 10,  priceCHF: '1.00', label: 'Starter',    popular: false },
  { tokens: 50,  priceCHF: '4.99', label: 'Popular',    popular: true  },
  { tokens: 100, priceCHF: '8.99', label: 'Best Value', popular: false },
] as const;

// ─── icons ────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

// ─── screen ───────────────────────────────────────────────────────────────────
export default function TopUpScreen() {
  const [loading, setLoading] = useState<number | null>(null);
  const [stayActive, setStayActive] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    AsyncStorage.getItem('wallet_data').then(raw => {
      if (!raw) { setStayActive(false); return; }
      const w = JSON.parse(raw);
      setStayActive(w.checkIn && w.checkOut ? isStayActive(w.checkIn, w.checkOut) : false);
    });
  }, []);

  const handleBuy = async (pack: typeof TOKEN_PACKS[number]) => {
    setLoading(pack.tokens);
    try {
      // 1. Get checkout URL from backend
      const redirectUrl = Linking.createURL('topup');
      const res = await fetch(`${BACKEND_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: pack.tokens, redirectUrl }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Backend error');
      }
      const { url } = await res.json();

      // 2. Open Stripe Checkout in browser; wait for deep-link redirect
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (result.type !== 'success') return; // user cancelled

      // 3. Parse redirect URL
      const parsed = Linking.parse(result.url);
      const status = parsed.queryParams?.status;
      if (status !== 'success') return;

      const sessionId = parsed.queryParams?.session_id as string;
      const tokens = Number(parsed.queryParams?.tokens);

      // 4. Verify payment server-side
      const verify = await fetch(`${BACKEND_URL}/verify-session?session_id=${sessionId}`);
      const { paid } = await verify.json();
      if (!paid) { Alert.alert('Payment not confirmed', 'Please try again.'); return; }

      // 5. Credit tokens
      await creditTokens(tokens);

      Alert.alert(
        'Tokens added! 🪙',
        `${tokens} tokens have been added to your wallet.`,
        [{ text: 'Great!', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const creditTokens = async (tokenAmount: number) => {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;

    if (FIREBASE_CONFIGURED && db) {
      const { doc, updateDoc, increment } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', userId), { tokenBalance: increment(tokenAmount) });
    }

    // Keep local cache in sync
    const raw = await AsyncStorage.getItem('wallet_data');
    if (raw) {
      const wallet = JSON.parse(raw);
      wallet.tokenBalance = (wallet.tokenBalance ?? 0) + tokenAmount;
      await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Tokens</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Top up your wallet</Text>
          <Text style={styles.heroSub}>
            Use tokens to pay at partner venues, book hotels, and unlock benefits across the Jungfrau region.
          </Text>
        </View>

        {stayActive === false && (
          <View style={styles.blockedCard}>
            <Text style={styles.blockedTitle}>Outside your stay period</Text>
            <Text style={styles.blockedText}>
              Token top-up is only available during your stay. You can still spend existing tokens.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>CHOOSE A PACK</Text>

        {TOKEN_PACKS.map((pack) => {
          const isProcessing = loading === pack.tokens;
          const disabled = loading !== null || stayActive === false;
          return (
            <TouchableOpacity
              key={pack.tokens}
              style={[styles.card, pack.popular && styles.cardPopular, stayActive === false && styles.cardDisabled]}
              onPress={() => !disabled && handleBuy(pack)}
              activeOpacity={0.85}
              disabled={disabled}
            >
              {pack.popular && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.cardRow}>
                <View>
                  <Text style={[styles.cardTokens, pack.popular && styles.cardTokensPopular]}>
                    {pack.tokens} Tokens
                  </Text>
                  <Text style={styles.cardLabel}>{pack.label}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardPrice, pack.popular && styles.cardPricePopular]}>
                    CHF {pack.priceCHF}
                  </Text>
                  {isProcessing ? (
                    <ActivityIndicator color={pack.popular ? '#111827' : '#84CC16'} style={{ marginTop: 8 }} />
                  ) : (
                    <View style={[styles.chip, pack.popular && styles.chipPopular]}>
                      <Text style={[styles.chipText, pack.popular && styles.chipTextPopular]}>Buy</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.rateRow}>
                <Text style={styles.rateText}>
                  CHF {(Number(pack.priceCHF) / pack.tokens).toFixed(3)} / token
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Test mode notice */}
        <View style={styles.testCard}>
          <Text style={styles.testTitle}>Test Mode — No Real Charges</Text>
          <Text style={styles.testText}>
            Card: <Text style={styles.testBold}>4242 4242 4242 4242</Text>
            {'  '}Expiry: <Text style={styles.testBold}>12/34</Text>
            {'  '}CVC: <Text style={styles.testBold}>123</Text>
          </Text>
        </View>

        <Text style={styles.secureNote}>Secured by Stripe · CHF prices</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#0D2818', paddingTop: 56, paddingBottom: 16,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },
  hero: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, gap: 8 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: '#6B7280', lineHeight: 21 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 1.2,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10,
  },
  card: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 20,
    backgroundColor: '#fff', padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  cardPopular: { backgroundColor: '#0D2818', borderColor: '#84CC16' },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#84CC16',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 12,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#111827', letterSpacing: 0.8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTokens: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  cardTokensPopular: { color: '#fff' },
  cardLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  cardPrice: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardPricePopular: { color: '#84CC16' },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  chipPopular: { backgroundColor: '#84CC16' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  chipTextPopular: { color: '#111827' },
  rateRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  rateText: { fontSize: 11, color: '#9CA3AF' },
  testCard: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: '#FFFBEB',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FDE68A', gap: 6,
  },
  testTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  testText: { fontSize: 12, color: '#78350F', lineHeight: 18 },
  testBold: { fontWeight: '800' },
  secureNote: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', paddingTop: 20 },
  blockedCard: {
    marginHorizontal: 16, marginTop: 8, backgroundColor: '#FEF2F2',
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA', gap: 4,
  },
  blockedTitle: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
  blockedText: { fontSize: 12, color: '#7F1D1D', lineHeight: 18 },
  cardDisabled: { opacity: 0.4 },
});
