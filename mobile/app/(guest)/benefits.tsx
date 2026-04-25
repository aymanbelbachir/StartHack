import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert, View, Text, TouchableOpacity } from 'react-native';
import { BenefitCard } from '@/components/BenefitCard';
import { BENEFITS } from '@/data/benefits';

const FILTERS = ['All', 'Available', 'Used'];

export default function BenefitsScreen() {
  const [activeFilter, setActiveFilter] = useState(0);

  const handleRedeem = (_benefitId: string) => {
    Alert.alert('Redeem Benefit', 'Go to the Scan tab and scan the partner QR code to redeem this benefit.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Benefits</Text>
        <Text style={styles.sub}>{BENEFITS.length} benefits included with your stay</Text>
      </View>

      {/* Filter pills */}
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

      {/* Benefit cards */}
      {BENEFITS.map((benefit) => (
        <BenefitCard key={benefit.id} benefit={benefit} onRedeem={() => handleRedeem(benefit.id)} />
      ))}
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
});
