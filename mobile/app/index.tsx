import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { HOTEL_CODES } from '@/data/landmarks';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { saveUserSnapshot, findLocalUserByEmail, restoreUserSnapshot } from '@/lib/userStore';

type Mode = 'signup' | 'signin';

export default function ActivationScreen() {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hotelCode, setHotelCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => { setChecking(false); }, []);

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!name || !email || !password || !hotelCode) {
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters');
      return;
    }
    if (!HOTEL_CODES.includes(hotelCode.toUpperCase())) {
      Alert.alert('Invalid code', 'Check your hotel confirmation code');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const walletData = {
        name, email: normalizedEmail,
        hotelCode: hotelCode.toUpperCase(),
        tokenBalance: 50, pointsBalance: 0,
        checkInLocation: hotelCode.replace('HOTEL-', '') + ' Hotel',
      };

      if (FIREBASE_CONFIGURED && db) {
        const { collection, query, where, getDocs, addDoc, serverTimestamp, limit } = await import('firebase/firestore');
        // Check if email already exists
        const existing = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1)));
        if (!existing.empty) {
          Alert.alert('Account exists', 'An account with this email already exists. Use "Sign in" instead.');
          return;
        }
        const docRef = await addDoc(collection(db, 'users'), {
          ...walletData,
          password, // stored for manual auth (Firestore-based)
          activatedAt: serverTimestamp(),
        });
        await AsyncStorage.multiSet([
          ['userId', docRef.id],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify(walletData)],
          ['transactions', '[]'],
        ]);
      } else {
        // Local fallback
        const existing = await findLocalUserByEmail(normalizedEmail);
        if (existing) {
          Alert.alert('Account exists', 'An account with this email already exists. Use "Sign in" instead.');
          return;
        }
        const userId = `local-${Date.now()}`;
        await AsyncStorage.multiSet([
          ['userId', userId],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify(walletData)],
          ['transactions', '[]'],
          ['registered_activities', '[]'],
          ['discovered_quests', '[]'],
          ['redeemed_benefits', '[]'],
          ['partner_balances', '{}'],
        ]);
        await saveUserSnapshot();
      }
      router.replace('/(guest)');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign In ──────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (FIREBASE_CONFIGURED && db) {
        const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1)));
        if (snap.empty) {
          Alert.alert('Not found', 'No account found with this email. Please create an account first.');
          return;
        }
        const userDoc = snap.docs[0];
        const userData = userDoc.data();
        if (userData.password !== password) {
          Alert.alert('Wrong password', 'Incorrect password. Please try again.');
          return;
        }
        const { password: _, activatedAt: __, ...walletData } = userData;
        await AsyncStorage.multiSet([
          ['userId', userDoc.id],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify(walletData)],
        ]);
      } else {
        // Local fallback
        const snapshot = await findLocalUserByEmail(normalizedEmail);
        if (!snapshot) {
          Alert.alert('Not found', 'No account found with this email.');
          return;
        }
        const wallet = JSON.parse(snapshot.wallet_data);
        if (wallet.password && wallet.password !== password) {
          Alert.alert('Wrong password', 'Incorrect password. Please try again.');
          return;
        }
        await restoreUserSnapshot(snapshot);
      }
      router.replace('/(guest)');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color="#84CC16" size="large" />
      </View>
    );
  }

  const isSignIn = mode === 'signin';

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1666030910636-6291b581962e?w=800&q=80' }}
        style={styles.hero}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <Text style={styles.withUs}>WITH US</Text>
        <Text style={styles.heroTitle}>Discover{'\n'}The Jungfrau{'\n'}Region</Text>
      </ImageBackground>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity style={[styles.modeBtn, !isSignIn && styles.modeBtnActive]} onPress={() => setMode('signup')}>
              <Text style={[styles.modeBtnText, !isSignIn && styles.modeBtnTextActive]}>Create account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, isSignIn && styles.modeBtnActive]} onPress={() => setMode('signin')}>
              <Text style={[styles.modeBtnText, isSignIn && styles.modeBtnTextActive]}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fields}>
            {!isSignIn && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName}
                  placeholder="Your name" placeholderTextColor="#D1D5DB" autoCapitalize="words" />
              </View>
            )}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="you@example.com" placeholderTextColor="#D1D5DB"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                placeholder={isSignIn ? 'Your password' : 'Min. 6 characters'}
                placeholderTextColor="#D1D5DB" secureTextEntry />
            </View>
            {!isSignIn && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Hotel Code</Text>
                <TextInput style={styles.input} value={hotelCode} onChangeText={setHotelCode}
                  placeholder="e.g. HOTEL-EIGER" placeholderTextColor="#D1D5DB" autoCapitalize="characters" />
              </View>
            )}
          </View>

          {!isSignIn && (
            <View style={styles.demoRow}>
              <Text style={styles.demoLabel}>Demo codes: </Text>
              {HOTEL_CODES.map((code) => (
                <TouchableOpacity key={code} onPress={() => setHotelCode(code)}>
                  <Text style={styles.demoCode}>{code}  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Button
            title={isSignIn ? 'Sign In' : 'Create Account'}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            loading={loading}
            style={styles.actionBtn}
          />

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
  splash: { flex: 1, backgroundColor: '#052e16', alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: '#052e16' },
  hero: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 44 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,46,22,0.52)' },
  withUs: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 5, marginBottom: 14 },
  heroTitle: { color: '#FFFFFF', fontSize: 50, fontWeight: '800', lineHeight: 56 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '62%' },
  sheetContent: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40, gap: 14 },
  modeRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#111827' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeBtnTextActive: { color: '#FFFFFF' },
  fields: { gap: 12 },
  field: { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.3 },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
  actionBtn: { marginTop: 4 },
  demoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  demoLabel: { fontSize: 11, color: '#D1D5DB' },
  demoCode: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  partnerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  partnerText: { fontSize: 13, color: '#9CA3AF' },
  partnerLink: { fontSize: 13, color: '#111827', fontWeight: '700' },
});
