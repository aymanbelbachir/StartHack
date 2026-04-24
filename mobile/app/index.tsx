import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/Button';
import { HOTEL_CODES } from '@/data/landmarks';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

export default function ActivationScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hotelCode, setHotelCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!name || !email || !hotelCode) {
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }
    if (!HOTEL_CODES.includes(hotelCode.toUpperCase())) {
      Alert.alert('Invalid Code', 'Please check your hotel confirmation code');
      return;
    }
    setLoading(true);
    try {
      const walletData = {
        name,
        email,
        hotelCode: hotelCode.toUpperCase(),
        tokenBalance: 50,
        pointsBalance: 0,
        checkInLocation: hotelCode.replace('HOTEL-', '') + ' Hotel',
      };

      let userId: string;

      if (FIREBASE_CONFIGURED && db) {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const docRef = await addDoc(collection(db, 'users'), {
          ...walletData,
          activatedAt: serverTimestamp(),
        });
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🏔️</Text>
          <Text style={[styles.title, { color: colors.primary }]}>JungfrauPass</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Your digital wallet for the Jungfrau Region
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Activate your wallet</Text>
          <Text style={[styles.cardSubtitle, { color: colors.icon }]}>
            Enter your name, email, and the code from your hotel confirmation
          </Text>
          <View style={styles.fields}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor={colors.icon}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.icon}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={hotelCode}
              onChangeText={setHotelCode}
              placeholder="Hotel code (e.g. HOTEL-EIGER)"
              placeholderTextColor={colors.icon}
              autoCapitalize="characters"
            />
          </View>
          <Button title="Activate Wallet 🎒" onPress={handleActivate} loading={loading} />
        </View>

        <View style={styles.partnerSection}>
          <Text style={[styles.partnerLabel, { color: colors.icon }]}>Are you a partner?</Text>
          <Button title="Partner Login" onPress={() => router.push('/role')} variant="outline" style={styles.partnerBtn} />
        </View>

        <Text style={[styles.hint, { color: colors.icon }]}>
          Demo codes: HOTEL-VICTORIA · HOTEL-EIGER · HOTEL-ALPINA
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 60 },
  hero: { alignItems: 'center', marginBottom: 32, gap: 8 },
  heroEmoji: { fontSize: 60 },
  title: { fontSize: 36, fontWeight: '800' },
  subtitle: { fontSize: 16, textAlign: 'center' },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 16, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '700' },
  cardSubtitle: { fontSize: 14, lineHeight: 20 },
  fields: { gap: 12 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  partnerSection: { alignItems: 'center', gap: 8, marginTop: 8 },
  partnerLabel: { fontSize: 14 },
  partnerBtn: { width: '100%' },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 16 },
});
