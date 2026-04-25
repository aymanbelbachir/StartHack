import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WalletCard } from '@/components/WalletCard';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionItem } from '@/components/TransactionItem';
import { ACTIVITIES } from '@/data/activities';
import Svg, { Path } from 'react-native-svg';

// ─── weather ─────────────────────────────────────────────────────────────────
function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤';
  if (code <= 48) return '🌫';
  if (code <= 67) return '🌧';
  if (code <= 77) return '🌨';
  if (code <= 82) return '🌦';
  return '⛈';
}

function useWeather() {
  const [weather, setWeather] = useState<{ temp: number; emoji: string } | null>(null);
  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=46.6863&longitude=7.8632&current=temperature_2m,weathercode&timezone=Europe%2FZurich'
    )
      .then(r => r.json())
      .then(d => {
        const temp = Math.round(d.current.temperature_2m);
        const emoji = weatherEmoji(d.current.weathercode);
        setWeather({ temp, emoji });
      })
      .catch(() => {});
  }, []);
  return weather;
}

// ─── icons ────────────────────────────────────────────────────────────────────
const BellIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const PILLS = ['🏔 Tokens', '🎟 Benefits', '⭐ Points', '🗺 Map'];

// ─── screen ───────────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeP, setActiveP] = useState(0);
  const { wallet, loading, refresh } = useWallet(userId);
  const { transactions } = useTransactions(userId);
  const weather = useWeather();

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
  const initial = name.charAt(0).toUpperCase();
  const balance = wallet?.tokenBalance ?? 50;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hi, {name}</Text>
          {weather && (
            <View style={styles.weatherPill}>
              <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
              <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
              <Text style={styles.weatherPlace}> · Interlaken</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <BellIcon />
        </TouchableOpacity>
      </View>

      {/* ── Title block ── */}
      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <Text style={styles.locationLabel}>JUNGFRAU REGION</Text>
            <Text style={styles.bigTitle}>Your{'\n'}Wallet</Text>
          </View>
          <View style={styles.avatarBadge}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <View style={styles.balanceBlock}>
              <Text style={styles.balanceAmount}>{balance}</Text>
              <Text style={styles.balanceCoin}>🪙</Text>
            </View>
            <Text style={styles.balanceLabel}>tokens</Text>
          </View>
        </View>
      </View>

      {/* ── Category pills ── */}
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

      {/* ── Wallet cards ── */}
      <WalletCard
        tokenBalance={balance}
        pointsBalance={wallet?.pointsBalance ?? 0}
        name={name}
        location={wallet?.checkInLocation ?? 'Jungfrau Region'}
      />

      {/* ── Discover ── */}
      <View style={styles.discoverSection}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Discover</Text>
          <TouchableOpacity onPress={() => router.push('/(guest)/activities' as any)}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discoverRow}
        >
          {ACTIVITIES.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={styles.discoverCard}
              onPress={() => router.push('/(guest)/activities' as any)}
              activeOpacity={0.88}
            >
              {activity.imageUrl ? (
                <Image source={{ uri: activity.imageUrl }} style={styles.discoverImg} resizeMode="cover" />
              ) : (
                <View style={[styles.discoverImg, { backgroundColor: '#14532D', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 36 }}>{activity.imageEmoji}</Text>
                </View>
              )}
              <View style={styles.discoverInfo}>
                <Text style={styles.discoverCategory}>{activity.category}</Text>
                <Text style={styles.discoverTitle} numberOfLines={2}>{activity.title}</Text>
                <Text style={styles.discoverLocation}>📍 {activity.location}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Recent transactions ── */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent</Text>
        {transactions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💳</Text>
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

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 130 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { color: '#9CA3AF', fontSize: 14 },

  // header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 4,
  },
  headerLeft: { gap: 6 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  weatherPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start',
  },
  weatherEmoji: { fontSize: 14 },
  weatherTemp: { fontSize: 13, fontWeight: '700', color: '#111827', marginLeft: 5 },
  weatherPlace: { fontSize: 12, color: '#9CA3AF' },
  bellBtn: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },

  // title block
  titleBlock: { paddingHorizontal: 24, marginTop: 12, marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleLeft: { gap: 4 },
  locationLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 3, textTransform: 'uppercase' },
  bigTitle: { fontSize: 40, fontWeight: '800', color: '#111827', lineHeight: 46, letterSpacing: -1 },

  avatarBadge: { alignItems: 'center', gap: 6, paddingBottom: 2 },
  avatarCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  balanceBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#111827', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  balanceAmount: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  balanceCoin: { fontSize: 16 },
  balanceLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  // pills
  pillsRow: { paddingHorizontal: 24, gap: 10, marginBottom: 20 },
  pill: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  pillActive: { backgroundColor: '#111827' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#FFFFFF' },

  // discover
  discoverSection: { paddingHorizontal: 24, marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#84CC16', fontWeight: '600' },
  discoverRow: { gap: 12, paddingRight: 24 },
  discoverCard: {
    width: 175, height: 220, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  discoverImg: { width: '100%', height: '100%', position: 'absolute' },
  discoverInfo: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 14, backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20, gap: 2,
  },
  discoverCategory: { fontSize: 10, fontWeight: '700', color: '#84CC16', letterSpacing: 1, textTransform: 'uppercase' },
  discoverTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', lineHeight: 18 },
  discoverLocation: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // recent
  recentSection: { paddingHorizontal: 24, marginTop: 28 },
  empty: { paddingVertical: 32, alignItems: 'center', gap: 6 },
  emptyIcon: { fontSize: 32, marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  viewAll: { color: '#84CC16', fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
});
