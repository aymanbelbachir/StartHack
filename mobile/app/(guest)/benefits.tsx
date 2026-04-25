import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Alert, View, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BenefitCard } from '@/components/BenefitCard';
import { BENEFITS } from '@/data/benefits';

const FILTERS = ['All', 'Available', 'Used'];

export default function BenefitsScreen() {
  const [activeFilter, setActiveFilter] = useState(0);
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem('redeemed_benefits').then((raw) => {
      if (raw) setRedeemed(new Set(JSON.parse(raw)));
    });
  }, []);

  const handleRedeem = (benefitId: string) => {
    Alert.alert(
      'Redeem Benefit',
      'Scan the partner QR code to redeem, or tap "Mark as Used" to demo the flow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Used',
          onPress: async () => {
            const next = new Set([...redeemed, benefitId]);
            setRedeemed(next);
            await AsyncStorage.setItem('redeemed_benefits', JSON.stringify([...next]));
          },
        },
      ]
    );
  };

  // All = everything
  // Available = multi_use always + one_time only if not yet redeemed
  // Used = redeemed at least once (multi_use can appear in both)
  const filtered = BENEFITS.filter((b) => {
    if (activeFilter === 0) return true;
    if (activeFilter === 1) return b.discountType === 'multi_use' || !redeemed.has(b.id);
    return redeemed.has(b.id);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Benefits</Text>
        <Text style={styles.sub}>{BENEFITS.length} benefits included with your stay</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f, i) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === i && styles.filterPillActive]}
            onPress={() => setActiveFilter(i)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, activeFilter === i && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {activeFilter === 1 ? 'All benefits have been used' : 'No used benefits yet'}
          </Text>
          <Text style={styles.emptySub}>
            {activeFilter === 1 ? 'Check the Used tab' : 'Redeem a benefit to see it here'}
          </Text>
        </View>
      ) : (
        filtered.map((b) => (
          <BenefitCard
            key={b.id}
            benefit={b}
            redeemed={redeemed.has(b.id)}
            onRedeem={() => handleRedeem(b.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 120 },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 4, gap: 4 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#6B7280' },
  filterRow: { paddingHorizontal: 24, paddingVertical: 16, gap: 10 },
  filterPill: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  filterPillActive: { backgroundColor: '#111827' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: '#FFFFFF' },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
