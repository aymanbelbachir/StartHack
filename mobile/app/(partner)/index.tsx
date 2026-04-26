import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from 'expo-router';
import { StackActions } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import Svg, { Path } from 'react-native-svg';

const MinusIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);
const PlusIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

export default function PartnerDashboard() {
  const navigation = useNavigation();
  const [partnerId, setPartnerId]     = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [tokenBalance, setTokenBalance] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(10);

  const lastTxIdRef  = useRef<string | null>(null);
  const listenerRef  = useRef<(() => void) | undefined>(undefined);

  // ── load initial data ──────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    const [id, name, savedPrice] = await Promise.all([
      AsyncStorage.getItem('partnerId'),
      AsyncStorage.getItem('partnerName'),
      AsyncStorage.getItem('partner_current_price'),
    ]);
    setPartnerId(id ?? '');
    setPartnerName(name ?? '');
    if (savedPrice) setCurrentPrice(parseInt(savedPrice) || 10);

    // Local balance fallback
    if (!FIREBASE_CONFIGURED || !db) {
      const raw = await AsyncStorage.getItem('partner_balances');
      if (raw && id) {
        const b: Record<string, number> = JSON.parse(raw);
        setTokenBalance(b[id] ?? 0);
      }
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);
  useFocusEffect(useCallback(() => { loadInitial(); }, [loadInitial]));

  // ── Firestore real-time listener ──────────────────────────────────────────
  useEffect(() => {
    if (!partnerId || !FIREBASE_CONFIGURED || !db) return;

    (async () => {
      const { doc, onSnapshot } = await import('firebase/firestore');
      listenerRef.current = onSnapshot(doc(db!, 'partners', partnerId), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();

        setTokenBalance(data.tokenBalance ?? 0);
        if (data.currentPrice) setCurrentPrice(data.currentPrice);

        if (data.lastPayment?.txId) lastTxIdRef.current = data.lastPayment.txId;
      });
    })();

    return () => { listenerRef.current?.(); };
  }, [partnerId]);

  // ── price update ──────────────────────────────────────────────────────────
  const updatePrice = async (val: number) => {
    const p = Math.max(1, val);
    setCurrentPrice(p);
    await AsyncStorage.setItem('partner_current_price', String(p));
    if (FIREBASE_CONFIGURED && db && partnerId) {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db!, 'partners', partnerId), { currentPrice: p, name: partnerName }, { merge: true });
    }
  };

  const qrValue = JSON.stringify({ id: partnerId, name: partnerName, amount: currentPrice });
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.heroLabel}>PARTNER DASHBOARD</Text>
          <Text style={styles.heroName}>{partnerName || '—'}</Text>
          <Text style={styles.heroId}>{partnerId}</Text>
          <View style={styles.heroBal}>
            <Text style={styles.heroBalLabel}>Total tokens received</Text>
            <Text style={styles.heroBalVal}>{tokenBalance} 🪙</Text>
          </View>
        </View>

        {/* ── Price setter ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Amount</Text>
          <Text style={styles.cardSub}>Guests scan your QR — they pay this amount instantly, no input needed</Text>

          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, currentPrice <= 1 && styles.stepBtnDisabled]}
              onPress={() => updatePrice(currentPrice - 1)}
              activeOpacity={0.75}
              disabled={currentPrice <= 1}
            >
              <MinusIcon />
            </TouchableOpacity>
            <View style={styles.stepCenter}>
              <Text style={styles.stepVal}>{currentPrice}</Text>
              <Text style={styles.stepUnit}>tokens</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => updatePrice(currentPrice + 1)} activeOpacity={0.75}>
              <PlusIcon />
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {[5, 10, 20, 50, 100].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.quickBtn, currentPrice === n && styles.quickBtnActive]}
                onPress={() => updatePrice(n)}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickText, currentPrice === n && styles.quickTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── QR code ── */}
        <View style={styles.qrCard}>
          <Text style={styles.cardTitle}>Your Payment QR</Text>
          <Text style={styles.cardSub}>Scanning this QR pays {currentPrice} tokens instantly</Text>

          <View style={styles.qrBox}>
            {partnerId ? (
              <QRCode value={qrValue} size={210} color="#111827" backgroundColor="#FFFFFF" />
            ) : (
              <View style={{ width: 210, height: 210, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#84CC16" size="large" />
              </View>
            )}
          </View>

          <View style={styles.qrPill}>
            <Text style={styles.qrPillText}>⚡ {currentPrice} tokens · {partnerName || '…'}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 120 },

  hero: { backgroundColor: '#111827', paddingHorizontal: 24, paddingBottom: 24, gap: 4 },
  heroLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  heroName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginTop: 6 },
  heroId: { color: 'rgba(255,255,255,0.28)', fontSize: 12 },
  heroBal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginTop: 16,
  },
  heroBalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  heroBalVal: { fontSize: 24, fontWeight: '800', color: '#84CC16' },

  card: {
    backgroundColor: '#FFFFFF', margin: 20, borderRadius: 24, padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  qrCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 24, padding: 20,
    alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardSub: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginTop: -6 },

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 18, padding: 8,
  },
  stepBtn: {
    width: 50, height: 50, borderRadius: 15, backgroundColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepCenter: { alignItems: 'center' },
  stepVal: { fontSize: 46, fontWeight: '800', color: '#111827', lineHeight: 52 },
  stepUnit: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: -4 },

  quickRow: { flexDirection: 'row', gap: 6 },
  quickBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F3F4F6', alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: '#111827' },
  quickText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  quickTextActive: { color: '#FFFFFF' },

  qrBox: {
    padding: 18, backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  qrPill: {
    backgroundColor: '#F0FDF4', borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  qrPillText: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
});
