import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Transaction } from '@/hooks/useTransactions';

interface TransactionItemProps {
  transaction: Transaction;
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isPayment = transaction.type === 'payment';
  const label = isPayment
    ? transaction.partnerName ?? 'Partner payment'
    : transaction.benefitTitle ?? 'Benefit redemption';

  const ts = transaction.timestamp;
  const dateStr = ts instanceof Date
    ? ts.toLocaleString()
    : typeof ts === 'string'
    ? new Date(ts).toLocaleString()
    : 'Just now';

  return (
    <View style={styles.item}>
      <View style={[styles.iconBox, isPayment ? styles.iconPay : styles.iconRedeem]}>
        <Text style={styles.iconText}>{isPayment ? '↑' : '★'}</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.time}>{dateStr}</Text>
      </View>
      <View style={styles.right}>
        {transaction.amount > 0 && (
          <Text style={styles.amount}>−{transaction.amount} T</Text>
        )}
        {transaction.pointsAwarded > 0 && (
          <Text style={styles.points}>+{transaction.pointsAwarded} pts</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 10, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  iconBox: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconPay: { backgroundColor: '#84CC16' },
  iconRedeem: { backgroundColor: '#F3F4F6' },
  iconText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  details: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827' },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  points: { fontSize: 11, color: '#65A30D', fontWeight: '600' },
});
