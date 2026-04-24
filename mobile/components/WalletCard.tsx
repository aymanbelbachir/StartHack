import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

interface WalletCardProps {
  tokenBalance: number;
  pointsBalance: number;
  name: string;
  location: string;
}

export function WalletCard({ tokenBalance, pointsBalance, name, location }: WalletCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: colors.primary }]}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.location}>📍 {location}</Text>
      </View>
      <View style={styles.balances}>
        <View style={styles.balance}>
          <Text style={[styles.amount, { color: colors.token }]}>{tokenBalance}</Text>
          <Text style={styles.label}>🪙 Tokens</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.balance}>
          <Text style={[styles.amount, { color: colors.points }]}>{pointsBalance}</Text>
          <Text style={styles.label}>⭐ Points</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  header: { marginBottom: 24 },
  name: { color: '#fff', fontSize: 20, fontWeight: '700' },
  location: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  balances: { flexDirection: 'row', alignItems: 'center' },
  balance: { flex: 1, alignItems: 'center' },
  amount: { fontSize: 40, fontWeight: '800' },
  label: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  divider: { width: 1, height: 60, backgroundColor: 'rgba(255,255,255,0.3)' },
});
