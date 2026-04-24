import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { Benefit } from '@/data/benefits';

interface BenefitCardProps {
  benefit: Benefit;
  redeemed?: boolean;
  onRedeem?: () => void;
}

export function BenefitCard({ benefit, redeemed = false, onRedeem }: BenefitCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: redeemed ? 0.5 : 1 }]}>
      <Text style={styles.emoji}>{benefit.emoji}</Text>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>{benefit.title}</Text>
        <Text style={[styles.description, { color: colors.icon }]}>{benefit.description}</Text>
        <Text style={[styles.partner, { color: colors.primary }]}>@ {benefit.partnerName}</Text>
      </View>
      {!redeemed && onRedeem && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onRedeem}>
          <Text style={styles.btnText}>Redeem</Text>
        </TouchableOpacity>
      )}
      {redeemed && (
        <View style={[styles.btn, { backgroundColor: colors.border }]}>
          <Text style={[styles.btnText, { color: colors.icon }]}>Used</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: { fontSize: 32 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  description: { fontSize: 12, marginTop: 2 },
  partner: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
