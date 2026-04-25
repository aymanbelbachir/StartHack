import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

export default function PartnerDashboard() {
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [tokenBalance, setTokenBalance] = useState(0);

  const loadBalance = useCallback(async (id: string) => {
    if (!id) return;

    if (FIREBASE_CONFIGURED && db) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'partners', id));
        if (snap.exists()) {
          setTokenBalance(snap.data().tokenBalance ?? 0);
          return;
        }
      } catch {}
    }

    // Local fallback
    const raw = await AsyncStorage.getItem('partner_balances');
    if (raw) {
      const balances: Record<string, number> = JSON.parse(raw);
      setTokenBalance(balances[id] ?? 0);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('partnerId'),
      AsyncStorage.getItem('partnerName'),
    ]).then(([id, name]) => {
      const pid = id ?? '';
      const pname = name ?? '';
      setPartnerId(pid);
      setPartnerName(pname);
      loadBalance(pid);
    });
  }, [loadBalance]);

  // Refresh balance every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      if (partnerId) loadBalance(partnerId);
    }, [partnerId, loadBalance])
  );

  // Firebase real-time listener
  useEffect(() => {
    if (!partnerId || !FIREBASE_CONFIGURED || !db) return;
    const setupListener = async () => {
      const { doc, onSnapshot } = await import('firebase/firestore');
      const unsub = onSnapshot(doc(db!, 'partners', partnerId), (snap) => {
        if (snap.exists()) setTokenBalance(snap.data().tokenBalance ?? 0);
      });
      return unsub;
    };
    let unsub: (() => void) | undefined;
    setupListener().then((fn) => { unsub = fn; });
    return () => { unsub?.(); };
  }, [partnerId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Hero header */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>PARTNER DASHBOARD</Text>
        <Text style={styles.heroName}>{partnerName || '—'}</Text>
        <Text style={styles.heroId}>{partnerId}</Text>
      </View>

      {/* QR card */}
      <View style={styles.qrCard}>
        <Text style={styles.qrTitle}>Payment QR Code</Text>
        <Text style={styles.qrSub}>Guests scan this to pay or redeem benefits</Text>
        <View style={styles.qrWrapper}>
          {partnerId ? (
            <QRCode value={partnerId} size={180} color="#111827" backgroundColor="#FFFFFF" />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>Loading...</Text>
            </View>
          )}
        </View>
        <Text style={styles.qrId}>{partnerId}</Text>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>TOKEN BALANCE RECEIVED</Text>
        <Text style={styles.balanceValue}>{tokenBalance}</Text>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 120 },

  hero: {
    backgroundColor: '#111827', padding: 28, paddingTop: 48, paddingBottom: 36, gap: 4,
  },
  heroLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 3 },
  heroName: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 },
  heroId: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },

  qrCard: {
    backgroundColor: '#FFFFFF', margin: 20, borderRadius: 24, padding: 24,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  qrTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  qrSub: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  qrWrapper: {
    padding: 20, backgroundColor: '#F9FAFB', borderRadius: 20, marginTop: 8,
  },
  qrPlaceholder: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  qrPlaceholderText: { color: '#D1D5DB', fontSize: 14 },
  qrId: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  balanceCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 20, borderRadius: 24, padding: 24,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  balanceLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 2 },
  balanceValue: { fontSize: 60, fontWeight: '800', color: '#111827', letterSpacing: -2, lineHeight: 68 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#84CC16' },
  liveText: { fontSize: 12, color: '#65A30D', fontWeight: '700' },
});
