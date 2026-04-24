import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/Card';

export default function PartnerDashboard() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('partnerId').then((v) => setPartnerId(v ?? ''));
    AsyncStorage.getItem('partnerName').then((v) => setPartnerName(v ?? ''));
  }, []);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Card style={styles.nameCard}>
        <Text style={[styles.partnerName, { color: colors.text }]}>{partnerName}</Text>
        <Text style={[styles.partnerId, { color: colors.icon }]}>{partnerId}</Text>
      </Card>

      <Card style={styles.qrCard}>
        <Text style={[styles.qrTitle, { color: colors.text }]}>Your QR Code</Text>
        <Text style={[styles.qrSubtitle, { color: colors.icon }]}>
          Guests scan this to pay or redeem benefits
        </Text>
        <View style={styles.qrWrapper}>
          {partnerId ? (
            <QRCode value={partnerId} size={200} color={colors.primary} />
          ) : (
            <View style={[styles.qrPlaceholder, { backgroundColor: colors.background }]}>
              <Text style={{ color: colors.icon }}>Loading QR...</Text>
            </View>
          )}
        </View>
      </Card>

      <Card style={styles.balanceCard}>
        <Text style={[styles.balanceLabel, { color: colors.icon }]}>Token Balance</Text>
        <Text style={[styles.balanceValue, { color: colors.token }]}>0 🪙</Text>
        <Text style={[styles.balanceHint, { color: colors.icon }]}>Updates in real-time via Firestore</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  nameCard: { alignItems: 'center', gap: 4 },
  partnerName: { fontSize: 22, fontWeight: '700' },
  partnerId: { fontSize: 13 },
  qrCard: { alignItems: 'center', gap: 12 },
  qrTitle: { fontSize: 18, fontWeight: '700' },
  qrSubtitle: { fontSize: 13, textAlign: 'center' },
  qrWrapper: { padding: 16 },
  qrPlaceholder: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { alignItems: 'center', gap: 4 },
  balanceLabel: { fontSize: 14 },
  balanceValue: { fontSize: 48, fontWeight: '800' },
  balanceHint: { fontSize: 12 },
});
