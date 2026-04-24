import React, { useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, Alert, TextInput, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/Button';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import type { WalletData } from '@/hooks/useWallet';

const PARTNER_NAMES: Record<string, string> = {
  'partner-jungfraujoch': 'Jungfraujoch Railway',
  'partner-victoria-restaurant': 'Hotel Victoria Restaurant',
  'partner-interlaken-adventure': 'Interlaken Adventure Sports',
  'partner-bakery': 'Grindelwald Bäckerei',
};

export default function ScanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'pay' | 'redeem'>('pay');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!partnerId) {
      Alert.alert('Missing', 'Enter a partner ID');
      return;
    }
    if (mode === 'pay' && (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0)) {
      Alert.alert('Missing', 'Enter a valid token amount');
      return;
    }

    const tokenAmt = parseInt(amount) || 0;
    const partnerName = PARTNER_NAMES[partnerId] ?? partnerId;

    Alert.alert(
      'Confirm',
      mode === 'pay'
        ? `Pay ${tokenAmt} tokens to ${partnerName}?`
        : `Redeem benefit at ${partnerName}?`,
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

              setPartnerId('');
              setAmount('');
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
    if (!raw) {
      Alert.alert('Error', 'Wallet not found');
      return;
    }
    const wallet: WalletData = JSON.parse(raw);

    if (mode === 'pay') {
      if (wallet.tokenBalance < tokenAmt) {
        Alert.alert('Insufficient tokens', `You only have ${wallet.tokenBalance} tokens`);
        return;
      }
      wallet.tokenBalance -= tokenAmt;
      wallet.pointsBalance = (wallet.pointsBalance ?? 0) + 10;
    }

    await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));

    const tx = {
      id: `tx-${Date.now()}`,
      fromUserId: userId,
      toPartnerId: partnerId,
      amount: mode === 'pay' ? tokenAmt : 0,
      pointsAwarded: mode === 'pay' ? 10 : 0,
      type: mode === 'pay' ? 'payment' : 'benefit_redemption',
      benefitId: null,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      partnerName,
    };

    const existing = JSON.parse((await AsyncStorage.getItem('transactions')) ?? '[]');
    await AsyncStorage.setItem('transactions', JSON.stringify([tx, ...existing]));

    if (mode === 'pay') {
      Alert.alert('Payment sent! 🎉', `Paid ${tokenAmt} tokens to ${partnerName}.\n+10 points earned! New balance: ${wallet.tokenBalance} tokens`);
    } else {
      Alert.alert('Benefit redeemed! 🎁', `Redemption sent to ${partnerName}.`);
    }
  };

  const processFirebaseTransaction = async (userId: string, partnerName: string, tokenAmt: number) => {
    try {
      const {
        collection, addDoc, doc, updateDoc, getDoc, serverTimestamp,
      } = await import('firebase/firestore');

      const userRef = doc(db!, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      const data = userSnap.data();

      if (mode === 'pay') {
        if (data.tokenBalance < tokenAmt) throw new Error(`Insufficient tokens (balance: ${data.tokenBalance})`);
        await updateDoc(userRef, {
          tokenBalance: data.tokenBalance - tokenAmt,
          pointsBalance: (data.pointsBalance ?? 0) + 10,
        });
      }

      await addDoc(collection(db!, 'transactions'), {
        fromUserId: userId,
        toPartnerId: partnerId,
        amount: mode === 'pay' ? tokenAmt : 0,
        pointsAwarded: mode === 'pay' ? 10 : 0,
        type: mode === 'pay' ? 'payment' : 'benefit_redemption',
        benefitId: null,
        timestamp: serverTimestamp(),
        status: 'confirmed',
        partnerName,
      });

      Alert.alert('Success! 🎉', mode === 'pay' ? `Paid ${tokenAmt} tokens. +10 points!` : 'Benefit redeemed!');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Transaction failed');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.modeToggle}>
        {(['pay', 'redeem'] as const).map((m) => (
          <Button
            key={m}
            title={m === 'pay' ? '💸 Pay' : '🎁 Redeem'}
            onPress={() => setMode(m)}
            variant={mode === m ? 'primary' : 'outline'}
            style={styles.modeBtn}
          />
        ))}
      </View>

      <View style={[styles.scannerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.scannerEmoji}>📷</Text>
        <Text style={[styles.scannerText, { color: colors.icon }]}>
          QR scanner coming soon{'\n'}Use manual entry below for demo
        </Text>
      </View>

      <Text style={[styles.orText, { color: colors.icon }]}>— enter partner ID manually —</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={partnerId}
        onChangeText={setPartnerId}
        placeholder="Partner ID (e.g. partner-bakery)"
        placeholderTextColor={colors.icon}
        autoCapitalize="none"
      />

      {mode === 'pay' && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount in tokens"
          placeholderTextColor={colors.icon}
          keyboardType="numeric"
        />
      )}

      <Button
        title={mode === 'pay' ? '💸 Pay Now' : '🎁 Redeem Benefit'}
        onPress={handleAction}
        loading={loading}
        style={styles.actionBtn}
      />

      <View style={[styles.hintBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.hintTitle, { color: colors.text }]}>Demo partner IDs</Text>
        {Object.entries(PARTNER_NAMES).map(([id, name]) => (
          <Text key={id} style={[styles.hintLine, { color: colors.icon }]}>
            • {id}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  modeToggle: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1 },
  scannerBox: {
    height: 180,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scannerEmoji: { fontSize: 48 },
  scannerText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  orText: { textAlign: 'center', fontSize: 13 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  actionBtn: { marginTop: 4 },
  hintBox: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 6 },
  hintTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  hintLine: { fontSize: 12 },
});
