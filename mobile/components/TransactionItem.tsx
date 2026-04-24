import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { Transaction } from '@/hooks/useTransactions';

interface TransactionItemProps {
  transaction: Transaction;
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const isPayment = transaction.type === 'payment';
  const emoji = isPayment ? '🪙' : '🎁';
  const label = isPayment
    ? `Paid at ${transaction.partnerName ?? 'partner'}`
    : `Redeemed: ${transaction.benefitTitle ?? 'benefit'}`;

  return (
    <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.details}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.time, { color: colors.icon }]}>
          {transaction.timestamp instanceof Date
            ? transaction.timestamp.toLocaleString()
            : 'Just now'}
        </Text>
      </View>
      <View style={styles.amounts}>
        <Text style={[styles.tokens, { color: colors.token }]}>-{transaction.amount} 🪙</Text>
        {transaction.pointsAwarded > 0 && (
          <Text style={[styles.points, { color: colors.points }]}>+{transaction.pointsAwarded} ⭐</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  emoji: { fontSize: 24 },
  details: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 2 },
  amounts: { alignItems: 'flex-end' },
  tokens: { fontSize: 14, fontWeight: '700' },
  points: { fontSize: 12, fontWeight: '600' },
});
