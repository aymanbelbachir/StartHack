import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { HOTEL_CODES } from '@/data/landmarks';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

export default function ActivationScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hotelCode, setHotelCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!name || !email || !hotelCode) { Alert.alert('Missing fields', 'Please fill in all fields'); return; }
    if (!HOTEL_CODES.includes(hotelCode.toUpperCase())) { Alert.alert('Invalid code', 'Check your hotel confirmation code'); return; }
    setLoading(true);
    try {
      const walletData = {
        name, email, hotelCode: hotelCode.toUpperCase(),
        tokenBalance: 50, pointsBalance: 0,
        checkInLocation: hotelCode.replace('HOTEL-', '') + ' Hotel',
      };
      let userId: string;
      if (FIREBASE_CONFIGURED && db) {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const docRef = await addDoc(collection(db, 'users'), { ...walletData, activatedAt: serverTimestamp() });
        userId = docRef.id;
      } else {
        userId = `local-${Date.now()}`;
      }
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('role', 'guest');
      await AsyncStorage.setItem('wallet_data', JSON.stringify(walletData));
      await AsyncStorage.setItem('transactions', JSON.stringify([]));
      router.replace('/(guest)');
    } catch {
      Alert.alert('Error', 'Activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.withUs}>WITH US</Text>
        <Text style={styles.heroTitle}>Discover{'\n'}The Jungfrau{'\n'}Region</Text>
      </View>

      {/* White bottom sheet */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>Activate your wallet</Text>

          <View style={styles.fields}>
            {[
              { label: 'Full Name', value: name, setter: setName, placeholder: 'Your name', keyboard: 'default' as const, caps: 'words' as const },
              { label: 'Email', value: email, setter: setEmail, placeholder: 'you@example.com', keyboard: 'email-address' as const, caps: 'none' as const },
              { label: 'Hotel Code', value: hotelCode, setter: setHotelCode, placeholder: 'e.g. HOTEL-EIGER', keyboard: 'default' as const, caps: 'characters' as const },
            ].map((f) => (
              <View key={f.label} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={f.value}
                  onChangeText={f.setter}
                  placeholder={f.placeholder}
                  placeholderTextColor="#D1D5DB"
                  keyboardType={f.keyboard}
                  autoCapitalize={f.caps}
                />
              </View>
            ))}
          </View>

          <Button title="Activate" onPress={handleActivate} loading={loading} style={styles.activateBtn} />

          <View style={styles.demoRow}>
            <Text style={styles.demoLabel}>Demo codes: </Text>
            {HOTEL_CODES.map((code) => (
              <TouchableOpacity key={code} onPress={() => setHotelCode(code)}>
                <Text style={styles.demoCode}>{code}  </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.partnerRow}>
            <Text style={styles.partnerText}>Are you a partner?</Text>
            <TouchableOpacity onPress={() => router.push('/role')}>
              <Text style={styles.partnerLink}>  Sign in here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#052e16' },
  hero: {
    flex: 1, justifyContent: 'flex-end',
    paddingHorizontal: 32, paddingBottom: 44,
  },
  withUs: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11,
    fontWeight: '700', letterSpacing: 5, marginBottom: 14,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 50, fontWeight: '800', lineHeight: 56 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '58%',
  },
  sheetContent: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 40, gap: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  fields: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.3 },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
  activateBtn: { marginTop: 4 },
  demoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  demoLabel: { fontSize: 11, color: '#D1D5DB' },
  demoCode: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  partnerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  partnerText: { fontSize: 13, color: '#9CA3AF' },
  partnerLink: { fontSize: 13, color: '#111827', fontWeight: '700' },
});
