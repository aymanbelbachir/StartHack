import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionItem } from '@/components/TransactionItem';
import { usePartnerTransactions } from '@/hooks/useTransactions';

export default function PartnerTransactionsScreen() {
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const { transactions, loading } = usePartnerTransactions(partnerId);

  useEffect(() => {
    AsyncStorage.getItem('partnerId').then(setPartnerId);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Feed</Text>
        <Text style={styles.sub}>Incoming payments & redemptions</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#84CC16" />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Waiting for payments</Text>
          <Text style={styles.emptyText}>Incoming transactions will appear here in real time</Text>
        </View>
      ) : (
        transactions.map((tx) => <TransactionItem key={tx.id} transaction={tx} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  header: { paddingTop: 20, paddingBottom: 20, gap: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#6B7280' },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  empty: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 10, marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, maxWidth: 240 },
});
