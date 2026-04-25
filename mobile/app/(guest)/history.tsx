import React, { useCallback, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionItem } from '@/components/TransactionItem';
import { useTransactions } from '@/hooks/useTransactions';

export default function HistoryScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const { transactions, loading, refresh } = useTransactions(userId);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('userId').then((id) => {
        setUserId(id);
        if (id) refresh();
      });
    }, [refresh])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.sub}>{transactions.length} transactions total</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.statusText}>Loading...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyText}>Scan a partner QR code to make your first payment</Text>
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
  header: { paddingTop: 60, paddingBottom: 20, gap: 4 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#9CA3AF' },
  center: { alignItems: 'center', paddingTop: 60 },
  statusText: { fontSize: 15, color: '#6B7280' },
  empty: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 10, marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, maxWidth: 240 },
});
