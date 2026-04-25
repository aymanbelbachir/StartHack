import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, ScrollView, Animated, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import type { WalletData } from '@/hooks/useWallet';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';

const PARTNER_NAMES: Record<string, string> = {
  'partner-jungfraujoch': 'Jungfraujoch Railway',
  'partner-victoria-restaurant': 'Hotel Victoria Restaurant',
  'partner-interlaken-adventure': 'Interlaken Adventure Sports',
  'partner-bakery': 'Grindelwald Bäckerei',
};

const CheckIcon = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke="#84CC16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CameraIcon = () => (
  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#9CA3AF" strokeWidth="1.5" />
    <Circle cx="12" cy="13" r="4" stroke="#9CA3AF" strokeWidth="1.5" />
  </Svg>
);

interface SuccessInfo {
  partnerName: string;
  amount: number;
  points: number;
  txId: string;
  timestamp: string;
  mode: 'pay' | 'redeem';
}

export default function ScanScreen() {
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'pay' | 'redeem'>('pay');
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const showSuccess = (info: SuccessInfo) => {
    setSuccessInfo(info);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
  };

  const resetForm = () => {
    setSuccessInfo(null);
    scaleAnim.setValue(0);
    setPartnerId('');
    setAmount('');
  };

  const handleAction = async () => {
    if (!partnerId) { Alert.alert('Missing', 'Enter a partner ID'); return; }
    if (mode === 'pay' && (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0)) {
      Alert.alert('Missing', 'Enter a valid token amount'); return;
    }
    const tokenAmt = parseInt(amount) || 0;
    const partnerName = PARTNER_NAMES[partnerId] ?? partnerId;

    Alert.alert(
      'Confirm',
      mode === 'pay' ? `Pay ${tokenAmt} tokens to ${partnerName}?` : `Redeem benefit at ${partnerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const userId = await AsyncStorage.getItem('userId') ?? '';
              if (FIREBASE_CONFIGURED && db) {
                await processFirebaseTransaction(userId, partnerName, tokenAmt);
              } else {
                await processLocalTransaction(userId, partnerName, tokenAmt);
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const processLocalTransaction = async (userId: string, partnerName: string, tokenAmt: number) => {
    const raw = await AsyncStorage.getItem('wallet_data');
    if (!raw) { Alert.alert('Error', 'Wallet not found'); return; }
    const wallet: WalletData = JSON.parse(raw);
    if (mode === 'pay') {
      if (wallet.tokenBalance < tokenAmt) { Alert.alert('Insufficient tokens', `Balance: ${wallet.tokenBalance}`); return; }
      wallet.tokenBalance -= tokenAmt;
      wallet.pointsBalance = (wallet.pointsBalance ?? 0) + 10;
    }
    await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));
    const txId = `tx-${Date.now()}`;
    const tx = {
      id: txId, fromUserId: userId, toPartnerId: partnerId,
      amount: mode === 'pay' ? tokenAmt : 0, pointsAwarded: mode === 'pay' ? 10 : 0,
      type: mode === 'pay' ? 'payment' : 'benefit_redemption', benefitId: null,
      timestamp: new Date().toISOString(), status: 'confirmed', partnerName,
    };
    const existing = JSON.parse((await AsyncStorage.getItem('transactions')) ?? '[]');
    await AsyncStorage.setItem('transactions', JSON.stringify([tx, ...existing]));
    showSuccess({ partnerName, amount: tokenAmt, points: mode === 'pay' ? 10 : 0, txId, timestamp: new Date().toLocaleString(), mode });
  };

  const processFirebaseTransaction = async (userId: string, partnerName: string, tokenAmt: number) => {
    try {
      const { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db!, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      const data = userSnap.data();
      if (mode === 'pay') {
        if (data.tokenBalance < tokenAmt) throw new Error(`Insufficient tokens (balance: ${data.tokenBalance})`);
        await updateDoc(userRef, { tokenBalance: data.tokenBalance - tokenAmt, pointsBalance: (data.pointsBalance ?? 0) + 10 });
      }
      const docRef = await addDoc(collection(db!, 'transactions'), {
        fromUserId: userId, toPartnerId: partnerId,
        amount: mode === 'pay' ? tokenAmt : 0, pointsAwarded: mode === 'pay' ? 10 : 0,
        type: mode === 'pay' ? 'payment' : 'benefit_redemption', benefitId: null,
        timestamp: serverTimestamp(), status: 'confirmed', partnerName,
      });
      showSuccess({ partnerName, amount: tokenAmt, points: mode === 'pay' ? 10 : 0, txId: docRef.id.slice(0, 8).toUpperCase(), timestamp: new Date().toLocaleString(), mode });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Transaction failed');
    }
  };

  if (successInfo) {
    return (
      <ScrollView style={styles.successContainer} contentContainerStyle={styles.successContent}>
        {/* Check circle */}
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <CheckIcon />
        </Animated.View>
        <Text style={styles.successTitle}>
          {successInfo.mode === 'pay' ? 'Payment Success!' : 'Benefit Redeemed!'}
        </Text>
        <Text style={styles.successSub}>Transaction confirmed</Text>

        {/* Receipt card */}
        <View style={styles.receipt}>
          <View style={styles.receiptPartner}>
            <View style={styles.partnerDot} />
            <Text style={styles.receiptPartnerName}>{successInfo.partnerName}</Text>
          </View>
          <View style={styles.receiptDivider} />
          {successInfo.amount > 0 && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Amount</Text>
              <Text style={styles.receiptValue}>{successInfo.amount} Tokens</Text>
            </View>
          )}
          {successInfo.points > 0 && (
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Points Earned</Text>
              <Text style={[styles.receiptValue, { color: '#65A30D' }]}>+{successInfo.points} pts</Text>
            </View>
          )}
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Time</Text>
            <Text style={styles.receiptValueSm}>{successInfo.timestamp}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Ref</Text>
            <Text style={styles.receiptValueSm}>{successInfo.txId}</Text>
          </View>
          <View style={styles.receiptDividerDash} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptTotal}>Total</Text>
            <Text style={styles.receiptTotal}>
              {successInfo.amount > 0 ? `${successInfo.amount} Tokens` : 'Benefit'}
            </Text>
          </View>
        </View>

        <Button title="Done" onPress={resetForm} variant="teal" style={styles.doneBtn} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        {(['pay', 'redeem'] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {m === 'pay' ? 'Pay' : 'Redeem'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scanner placeholder */}
      <View style={styles.scannerBox}>
        <CameraIcon />
        <Text style={styles.scannerTitle}>QR Scanner</Text>
        <Text style={styles.scannerSub}>Coming soon — use manual entry below</Text>
      </View>

      {/* Form */}
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>Partner ID</Text>
        <TextInput
          style={styles.input}
          value={partnerId}
          onChangeText={setPartnerId}
          placeholder="e.g. partner-bakery"
          placeholderTextColor="#D1D5DB"
          autoCapitalize="none"
        />
        {mode === 'pay' && (
          <>
            <Text style={[styles.formLabel, { marginTop: 14 }]}>Amount (tokens)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 10"
              placeholderTextColor="#D1D5DB"
              keyboardType="numeric"
            />
          </>
        )}
        <Button
          title={mode === 'pay' ? 'Pay Now' : 'Redeem Benefit'}
          onPress={handleAction}
          loading={loading}
          style={{ marginTop: 16 }}
        />
      </View>

      {/* Demo hints */}
      <View style={styles.hintCard}>
        <Text style={styles.hintTitle}>DEMO PARTNERS</Text>
        {Object.entries(PARTNER_NAMES).map(([id, name]) => (
          <TouchableOpacity key={id} onPress={() => setPartnerId(id)} style={styles.hintRow}>
            <Text style={styles.hintName}>{name}</Text>
            <Text style={styles.hintId}>{id}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingBottom: 120, gap: 16 },

  modeToggle: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  modeBtnTextActive: { color: '#111827' },

  scannerBox: {
    backgroundColor: '#FFFFFF', borderRadius: 24, height: 160,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    borderColor: '#E5E7EB', borderStyle: 'dashed', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  scannerTitle: { fontSize: 15, fontWeight: '700', color: '#374151' },
  scannerSub: { fontSize: 12, color: '#9CA3AF' },

  formCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 4 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },

  hintCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 4 },
  hintTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 12 },
  hintRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  hintName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  hintId: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  successContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  successContent: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  checkCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: '#9CA3AF' },

  receipt: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 24, padding: 20, marginTop: 8, gap: 2 },
  receiptPartner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 12 },
  partnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#84CC16' },
  receiptPartnerName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  receiptDivider: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginVertical: 8 },
  receiptDividerDash: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', borderStyle: 'dashed', marginVertical: 8 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  receiptLabel: { fontSize: 13, color: '#9CA3AF' },
  receiptValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  receiptValueSm: { fontSize: 12, color: '#374151', maxWidth: '60%', textAlign: 'right' },
  receiptTotal: { fontSize: 15, fontWeight: '800', color: '#111827' },
  doneBtn: { width: '100%', marginTop: 12 },
});
