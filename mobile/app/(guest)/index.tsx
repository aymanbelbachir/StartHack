import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { WalletCard } from '@/components/WalletCard';
import { Card } from '@/components/Card';
import { useWallet } from '@/hooks/useWallet';

export default function WalletScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [userId, setUserId] = useState<string | null>(null);
  const { wallet, loading, refresh } = useWallet(userId);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('userId').then((id) => {
        setUserId(id);
        if (id) refresh();
      });
    }, [refresh])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.icon }}>Loading wallet...</Text>
      </View>
    );
  }

  const quickActions = [
    { label: 'Pay', emoji: '💸', route: '/(guest)/scan' },
    { label: 'Benefits', emoji: '🎁', route: '/(guest)/benefits' },
    { label: 'Activities', emoji: '🗺️', route: '/(guest)/activities' },
    { label: 'History', emoji: '📋', route: '/(guest)/history' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <WalletCard
        tokenBalance={wallet?.tokenBalance ?? 50}
        pointsBalance={wallet?.pointsBalance ?? 0}
        name={wallet?.name ?? 'Guest'}
        location={wallet?.checkInLocation ?? 'Jungfrau Region'}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(action.route as any)}
          >
            <Text style={styles.actionEmoji}>{action.emoji}</Text>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.infoCard}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>🏔️ Welcome to Jungfrau Region</Text>
        <Text style={[styles.infoText, { color: colors.icon }]}>
          Your wallet is loaded with 50 tokens. Scan QR codes at partner stores to pay, redeem benefits, and earn discovery points!
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingVertical: 16, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  actionBtn: { width: '46%', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, gap: 8 },
  actionEmoji: { fontSize: 32 },
  actionLabel: { fontSize: 15, fontWeight: '600' },
  infoCard: { marginHorizontal: 16 },
  infoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  infoText: { fontSize: 14, lineHeight: 20 },
});
