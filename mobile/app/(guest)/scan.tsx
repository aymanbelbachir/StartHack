import React, { useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, Alert, TextInput } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/Button';

export default function ScanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'pay' | 'redeem'>('pay');

  const handleAction = () => {
    if (!partnerId) {
      Alert.alert('Missing', 'Enter a partner ID');
      return;
    }
    if (mode === 'pay' && !amount) {
      Alert.alert('Missing', 'Enter an amount');
      return;
    }
    Alert.alert(
      'Confirm',
      mode === 'pay' ? `Pay ${amount} tokens to ${partnerId}?` : `Redeem benefit at ${partnerId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => Alert.alert('Success', 'Transaction sent! (Connect Firebase to make this live)') },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          Camera QR scanner{'\n'}(requires expo-camera permissions)
        </Text>
      </View>

      <Text style={[styles.orText, { color: colors.icon }]}>— or enter manually —</Text>

      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={partnerId}
        onChangeText={setPartnerId}
        placeholder="Partner ID"
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
        style={styles.actionBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  modeToggle: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1 },
  scannerBox: {
    height: 220,
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
  actionBtn: { marginTop: 8 },
});
