import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle } from 'react-native-svg';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

interface PendingRedemption {
  txId: string;
  guestId: string;
  benefitTitle: string;
  partnerName: string;
  timestamp: string;
}

const CheckIcon = () => (
  <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#84CC16" strokeWidth="1.8" />
    <Path d="M8 12l3 3 5-5" stroke="#84CC16" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function ConfirmScreen() {
  const [pending, setPending] = useState<PendingRedemption | null>(null);
  const [loading, setLoading] = useState(false);
  const listenerRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!FIREBASE_CONFIGURED || !db) return;

    (async () => {
      const partnerId = await AsyncStorage.getItem('partnerId');
      if (!partnerId) return;

      const { collection, query, where, onSnapshot, limit } = await import('firebase/firestore');
      const q = query(
        collection(db!, 'transactions'),
        where('toPartnerId', '==', partnerId),
        where('status', '==', 'pending'),
        limit(1),
      );

      listenerRef.current = onSnapshot(q, (snap: any) => {
        if (snap.empty) { setPending(null); return; }
        const doc = snap.docs[0];
        const data = doc.data();
        setPending({
          txId: doc.id,
          guestId: data.fromUserId ?? '—',
          benefitTitle: data.benefitTitle ?? 'Benefit',
          partnerName: data.partnerName ?? '',
          timestamp: data.timestamp?.toDate?.()?.toLocaleTimeString() ?? '',
        });
      });
    })();

    return () => { listenerRef.current?.(); };
  }, []);

  const handleAccept = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      if (FIREBASE_CONFIGURED && db) {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db!, 'transactions', pending.txId), { status: 'confirmed' });
      }
      Alert.alert('Accepted', 'Benefit redemption confirmed.');
      setPending(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      if (FIREBASE_CONFIGURED && db) {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db!, 'transactions', pending.txId), { status: 'rejected' });
      }
      Alert.alert('Rejected', 'Redemption request rejected.');
      setPending(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!pending ? (
        <View style={styles.waiting}>
          <View style={styles.waitingIcon}>
            <CheckIcon />
          </View>
          <Text style={styles.waitingTitle}>Ready to confirm</Text>
          <Text style={styles.waitingSubtitle}>
            When a guest redeems a benefit at your location, it will appear here for confirmation.
          </Text>
        </View>
      ) : (
        <View style={styles.confirmWrapper}>
          {/* Request card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.dot} />
              <Text style={styles.cardTitle}>Redemption Request</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.fieldLabel}>BENEFIT</Text>
              <Text style={styles.fieldValue}>{pending.benefitTitle}</Text>
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>GUEST ID</Text>
              <Text style={styles.guestId}>{pending.guestId}</Text>
              {pending.timestamp ? (
                <Text style={styles.timestamp}>{pending.timestamp}</Text>
              ) : null}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.acceptBtn, loading && { opacity: 0.5 }]}
                onPress={handleAccept}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#111827" size="small" />
                ) : (
                  <Text style={styles.acceptText}>Accept</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, loading && { opacity: 0.5 }]}
                onPress={handleReject}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 24, paddingBottom: 90 },

  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  waitingIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  waitingTitle: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center' },
  waitingSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, maxWidth: 280 },

  confirmWrapper: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#84CC16' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardBody: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 4 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5, marginTop: 4 },
  fieldValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  guestId: { fontSize: 12, color: '#6B7280', fontFamily: undefined },
  timestamp: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12 },
  acceptBtn: {
    flex: 1, backgroundColor: '#84CC16', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { fontSize: 15, fontWeight: '800', color: '#111827' },
  rejectBtn: {
    flex: 1, backgroundColor: '#FEF2F2', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  rejectText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
