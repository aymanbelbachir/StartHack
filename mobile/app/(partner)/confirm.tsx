import React, { useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

interface PendingRedemption {
  guestId: string;
  benefit: string;
}

export default function ConfirmScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [pending, setPending] = useState<PendingRedemption | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!pending ? (
        <View style={styles.waiting}>
          <Text style={styles.waitingEmoji}>✅</Text>
          <Text style={[styles.waitingTitle, { color: colors.text }]}>Waiting for redemption...</Text>
          <Text style={[styles.waitingSubtitle, { color: colors.icon }]}>
            When a guest redeems a benefit at your store, it will appear here for confirmation.
          </Text>
        </View>
      ) : (
        <Card style={styles.confirmCard}>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>Redemption Request</Text>
          <Text style={[styles.benefit, { color: colors.primary }]}>{pending.benefit}</Text>
          <Text style={[styles.guest, { color: colors.icon }]}>Guest: {pending.guestId}</Text>
          <View style={styles.actions}>
            <Button
              title="✓ Accept"
              onPress={() => {
                Alert.alert('Accepted', 'Benefit redeemed successfully!');
                setPending(null);
              }}
              style={styles.acceptBtn}
            />
            <Button
              title="✗ Reject"
              onPress={() => {
                Alert.alert('Rejected', 'Redemption rejected.');
                setPending(null);
              }}
              variant="outline"
              style={styles.rejectBtn}
            />
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  waitingEmoji: { fontSize: 64 },
  waitingTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  waitingSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  confirmCard: { gap: 16 },
  confirmTitle: { fontSize: 20, fontWeight: '700' },
  benefit: { fontSize: 18, fontWeight: '600' },
  guest: { fontSize: 14 },
  actions: { flexDirection: 'row', gap: 12 },
  acceptBtn: { flex: 1 },
  rejectBtn: { flex: 1 },
});
