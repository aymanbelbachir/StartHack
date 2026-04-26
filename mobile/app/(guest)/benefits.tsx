import React, { useState, useEffect } from 'react';
import {
  ScrollView, StyleSheet, Alert, View, Text, TouchableOpacity,
  Modal, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { saveUserSnapshot } from '@/lib/userStore';
import { BenefitCard } from '@/components/BenefitCard';
import { BENEFITS } from '@/data/benefits';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import Svg, { Path } from 'react-native-svg';

const FILTERS = ['All', 'Available', 'Used'];

const CloseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

export default function BenefitsScreen() {
  const [activeFilter, setActiveFilter] = useState(0);
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set());
  const [scanningBenefitId, setScanningBenefitId] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    AsyncStorage.getItem('redeemed_benefits').then((raw) => {
      if (raw) setRedeemed(new Set(JSON.parse(raw)));
    });
  }, []);

  const handleRedeem = async (benefitId: string) => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission required', 'Camera access is needed to scan the partner QR code.');
        return;
      }
    }
    setScanned(false);
    setScanningBenefitId(benefitId);
  };

  const completeRedemption = async (benefitId: string, partner: { id: string; name: string }) => {
    const benefit = BENEFITS.find(b => b.id === benefitId);
    const next = new Set([...redeemed, benefitId]);
    setRedeemed(next);
    await AsyncStorage.setItem('redeemed_benefits', JSON.stringify([...next]));

    const userId = await AsyncStorage.getItem('userId');
    const tx = {
      id: `tx-${Date.now()}`,
      fromUserId: userId ?? '',
      toPartnerId: partner.id,
      amount: 0,
      pointsAwarded: 0,
      type: 'benefit_redemption',
      benefitId,
      benefitTitle: benefit?.title ?? '',
      timestamp: new Date().toISOString(),
      status: 'pending',
      partnerName: partner.name,
    };

    if (FIREBASE_CONFIGURED && db && userId) {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'transactions'), { ...tx, timestamp: serverTimestamp() });
    }

    const existing = JSON.parse((await AsyncStorage.getItem('transactions')) ?? '[]');
    await AsyncStorage.setItem('transactions', JSON.stringify([tx, ...existing]));
    await saveUserSnapshot();

    Alert.alert('Benefit sent!', `${benefit?.title ?? 'Benefit'} redemption request sent to ${partner.name}.`);
  };

  const handleQRScanned = async ({ data }: { data: string }) => {
    if (scanned || !scanningBenefitId) return;
    setScanned(true);

    try {
      const payload = JSON.parse(data);
      if (!payload.id || !payload.name) throw new Error('Invalid QR');
      const partner = { id: payload.id, name: payload.name };
      await AsyncStorage.setItem('last_scanned_partner', JSON.stringify(partner));
      const benefitId = scanningBenefitId;
      setScanningBenefitId(null);
      await completeRedemption(benefitId, partner);
    } catch {
      Alert.alert('Invalid QR', 'This QR code is not a valid partner code.');
      setScanned(false);
    }
  };

  const filtered = BENEFITS.filter((b) => {
    if (activeFilter === 0) return true;
    if (activeFilter === 1) return b.discountType === 'multi_use' || !redeemed.has(b.id);
    return redeemed.has(b.id);
  });

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Benefits</Text>
          <Text style={styles.sub}>{BENEFITS.length} benefits included with your stay</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f, i) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, activeFilter === i && styles.filterPillActive]}
              onPress={() => setActiveFilter(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, activeFilter === i && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {activeFilter === 1 ? 'All benefits have been used' : 'No used benefits yet'}
            </Text>
            <Text style={styles.emptySub}>
              {activeFilter === 1 ? 'Check the Used tab' : 'Redeem a benefit to see it here'}
            </Text>
          </View>
        ) : (
          filtered.map((b) => (
            <BenefitCard
              key={b.id}
              benefit={b}
              redeemed={redeemed.has(b.id)}
              onRedeem={() => handleRedeem(b.id)}
            />
          ))
        )}
      </ScrollView>

      {/* QR scan modal */}
      <Modal visible={!!scanningBenefitId} animationType="slide" onRequestClose={() => setScanningBenefitId(null)}>
        <View style={styles.cameraContainer}>
          {cameraPermission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleQRScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
          ) : (
            <ActivityIndicator color="#84CC16" size="large" />
          )}

          <View style={styles.overlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setScanningBenefitId(null)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Scan the partner's QR code</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 120 },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 4, gap: 4 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#6B7280' },
  filterRow: { paddingHorizontal: 24, paddingVertical: 16, gap: 10 },
  filterPill: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  filterPillActive: { backgroundColor: '#111827' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filterTextActive: { color: '#FFFFFF' },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingBottom: 80 },
  cameraHeader: { paddingTop: 60, paddingHorizontal: 20, alignItems: 'flex-end' },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  scanFrame: {
    width: 220, height: 220, alignSelf: 'center',
    borderWidth: 2, borderColor: '#84CC16', borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanHint: {
    textAlign: 'center', color: '#fff', fontSize: 15,
    fontWeight: '600', paddingHorizontal: 40,
  },
});
