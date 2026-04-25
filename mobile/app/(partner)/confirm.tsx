import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

interface PendingRedemption {
  guestId: string;
  benefit: string;
}

export default function ConfirmScreen() {
  const [pending, setPending] = useState<PendingRedemption | null>(null);

  return (
    <View style={styles.container}>
      {!pending ? (
        <View style={styles.waiting}>
          <View style={styles.waitingIcon}>
            <Text style={styles.waitingEmoji}>✓</Text>
          </View>
          <Text style={styles.waitingTitle}>Ready to confirm</Text>
          <Text style={styles.waitingSubtitle}>
            When a guest redeems a benefit at your location, it will appear here for confirmation.
          </Text>
        </View>
      ) : (
        <View style={styles.confirmWrapper}>
          <Card style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <View style={styles.confirmDot} />
              <Text style={styles.confirmTitle}>Redemption Request</Text>
            </View>
            <View style={styles.confirmBody}>
              <Text style={styles.benefitLabel}>BENEFIT</Text>
              <Text style={styles.benefit}>{pending.benefit}</Text>
              <Text style={styles.guest}>Guest ID: {pending.guestId}</Text>
            </View>
            <View style={styles.actions}>
              <Button
                title="Accept"
                onPress={() => {
                  Alert.alert('Accepted', 'Benefit redeemed successfully!');
                  setPending(null);
                }}
                style={styles.acceptBtn}
              />
              <Button
                title="Reject"
                onPress={() => {
                  Alert.alert('Rejected', 'Redemption rejected.');
                  setPending(null);
                }}
                variant="outline"
                style={styles.rejectBtn}
              />
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 24, paddingBottom: 120 },

  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  waitingIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  waitingEmoji: { fontSize: 36, color: '#84CC16' },
  waitingTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  waitingSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  confirmWrapper: { flex: 1, justifyContent: 'center' },
  confirmCard: { gap: 20 },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#84CC16' },
  confirmTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  confirmBody: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 6 },
  benefitLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5 },
  benefit: { fontSize: 16, fontWeight: '700', color: '#111827' },
  guest: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  acceptBtn: { flex: 1 },
  rejectBtn: { flex: 1 },
});
