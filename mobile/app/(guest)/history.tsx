import React, { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { TransactionItem } from '@/components/TransactionItem';
import { useTransactions } from '@/hooks/useTransactions';

export default function HistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [userId, setUserId] = useState<string | null>(null);
  const { transactions, loading } = useTransactions(userId);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(setUserId);
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.icon }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No transactions yet. Start scanning partner QR codes!
          </Text>
        </View>
      ) : (
        transactions.map((tx) => <TransactionItem key={tx.id} transaction={tx} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
