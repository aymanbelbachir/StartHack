import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionItem } from '@/components/TransactionItem';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const BellIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const PILLS = ['🏔 Tokens', '🎟 Benefits', '⭐ Points', '🗺 Map'];

const QUICK_ACTIONS = [
  { label: 'Pay', icon: '↑', route: '/(guest)/scan' as const },
  { label: 'Scan', icon: '⊡', route: '/(guest)/scan' as const },
  { label: 'History', icon: '◷', route: '/(guest)/history' as const },
  { label: 'Redeem', icon: '★', route: '/(guest)/benefits' as const },
];

export default function WalletScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeP, setActiveP] = useState(0);
  const { wallet, loading, refresh } = useWallet(userId);
  const { transactions } = useTransactions(userId);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('userId').then((id) => {
        setUserId(id);
        if (id) refresh();
      });
    }, [refresh])
  );

  if (loading) {
    return <View style={styles.loading}><Text style={styles.loadingText}>Loading...</Text></View>;
  }

  const name = wallet?.name ?? 'Guest';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {name}</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <BellIcon />
        </TouchableOpacity>
      </View>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={styles.locationLabel}>JUNGFRAU REGION</Text>
        <Text style={styles.bigTitle}>Your{'\n'}Wallet</Text>
      </View>

      {/* Category pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
        {PILLS.map((pill, i) => (
          <TouchableOpacity
            key={pill}
            style={[styles.pill, activeP === i && styles.pillActive]}
            onPress={() => setActiveP(i)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeP === i && styles.pillTextActive]}>{pill}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Wallet cards */}
      <WalletCard
        tokenBalance={wallet?.tokenBalance ?? 50}
        pointsBalance={wallet?.pointsBalance ?? 0}
        name={name}
        location={wallet?.checkInLocation ?? 'Jungfrau Region'}
      />

      {/* Quick actions */}
      <View style={styles.actionsSection}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity onPress={() => router.push('/(guest)/history' as any)}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBtn}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent transactions */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent</Text>
        {transactions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySub}>Scan a partner QR to get started</Text>
          </View>
        ) : (
          <>
            {transactions.slice(0, 4).map((tx) => <TransactionItem key={tx.id} transaction={tx} />)}
            {transactions.length > 4 && (
              <TouchableOpacity onPress={() => router.push('/(guest)/history' as any)}>
                <Text style={styles.viewAll}>View all transactions</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 120 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { color: '#9CA3AF', fontSize: 14 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 4,
  },
  greeting: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  bellBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  titleBlock: { paddingHorizontal: 24, marginTop: 8, marginBottom: 20, gap: 4 },
  locationLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 3, textTransform: 'uppercase' },
  bigTitle: { fontSize: 40, fontWeight: '800', color: '#111827', lineHeight: 46, letterSpacing: -1 },

  pillsRow: { paddingHorizontal: 24, gap: 10, marginBottom: 20 },
  pill: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  pillActive: { backgroundColor: '#111827' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#FFFFFF' },

  actionsSection: { paddingHorizontal: 24, marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#84CC16', fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 16,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  actionIcon: { fontSize: 22, color: '#374151' },
  actionLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  recentSection: { paddingHorizontal: 24, marginTop: 28 },
  empty: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  viewAll: { color: '#84CC16', fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
});
