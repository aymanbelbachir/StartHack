import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { TransactionItem } from '@/components/TransactionItem';
import { usePartnerTransactions } from '@/hooks/useTransactions';

export default function PartnerTransactionsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const { transactions, loading } = usePartnerTransactions(partnerId);

  useEffect(() => {
    AsyncStorage.getItem('partnerId').then(setPartnerId);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {loading ? (
        <Text style={[styles.status, { color: colors.icon }]}>Loading...</Text>
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={[styles.status, { color: colors.icon }]}>Waiting for incoming payments...</Text>
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
  empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyEmoji: { fontSize: 48 },
  status: { fontSize: 15, textAlign: 'center' },
});
