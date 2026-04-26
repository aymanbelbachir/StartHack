import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import type { Video as VideoType } from 'expo-av';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { saveUserSnapshot, findLocalUserByEmail, restoreUserSnapshot } from '@/lib/userStore';

type Mode = 'signup' | 'signin';

// ─── Firebase Auth REST API (works in Expo Go — no native SDK needed) ─────────
const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';
const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

async function authRequest(endpoint: string, body: object) {
  const res = await fetch(`${AUTH_URL}:${endpoint}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message ?? 'UNKNOWN';
    const messages: Record<string, string> = {
      EMAIL_EXISTS:              'An account with this email already exists. Use Sign In.',
      EMAIL_NOT_FOUND:           'No account with this email. Create an account first.',
      INVALID_PASSWORD:          'Incorrect password.',
      INVALID_LOGIN_CREDENTIALS: 'Incorrect email or password.',
      TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please wait and try again.',
      WEAK_PASSWORD:             'Password must be at least 6 characters.',
      INVALID_EMAIL:             'Please enter a valid email address.',
    };
    throw new Error(messages[code] ?? code);
  }
  return data as { localId: string; idToken: string; email: string };
}

// ─── screen ───────────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const videoRef = useRef<VideoType>(null);

  useEffect(() => { setChecking(false); }, []);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (FIREBASE_CONFIGURED && db) {
        const { collection, query, where, getDocs, doc, setDoc, serverTimestamp, limit } = await import('firebase/firestore');

        // If email belongs to a partner: create their Firebase Auth account and go to partner dashboard
        const partnerSnap = await getDocs(
          query(collection(db, 'partners'), where('email', '==', normalizedEmail), limit(1))
        );
        if (!partnerSnap.empty) {
          await authRequest('signUp', {
            email: normalizedEmail, password, returnSecureToken: true,
          });
          const partnerDoc = partnerSnap.docs[0];
          await AsyncStorage.multiSet([
            ['partnerId', partnerDoc.id],
            ['partnerName', partnerDoc.data().name ?? ''],
            ['role', 'partner'],
          ]);
          router.replace('/(partner)');
          return;
        }

        // Regular guest sign-up — create Firebase Auth user (password stored securely by Firebase)
        const { localId } = await authRequest('signUp', {
          email: normalizedEmail, password, returnSecureToken: true,
        });

        // Firestore profile — no password stored here
        await setDoc(doc(db, 'users', localId), {
          name, email: normalizedEmail,
          tokenBalance: 0, pointsBalance: 0,
          createdAt: serverTimestamp(),
        });

        await AsyncStorage.multiSet([
          ['userId', localId],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify({ name, email: normalizedEmail, tokenBalance: 0, pointsBalance: 0 })],
          ['transactions', '[]'],
          ['registered_activities', '[]'],
          ['discovered_quests', '[]'],
          ['redeemed_benefits', '[]'],
          ['partner_balances', '{}'],
        ]);
      } else {
        // Offline fallback
        const existing = await findLocalUserByEmail(normalizedEmail);
        if (existing) {
          Alert.alert('Account exists', 'An account with this email already exists. Use Sign In.');
          return;
        }
        const userId = `local-${Date.now()}`;
        await AsyncStorage.multiSet([
          ['userId', userId],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify({ name, email: normalizedEmail, tokenBalance: 0, pointsBalance: 0 })],
          ['transactions', '[]'],
          ['registered_activities', '[]'],
          ['discovered_quests', '[]'],
          ['redeemed_benefits', '[]'],
          ['partner_balances', '{}'],
        ]);
        await saveUserSnapshot();
      }

      // New users always go to activate first
      router.replace('/activate' as any);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (FIREBASE_CONFIGURED && db) {
        const { collection, query, where, getDocs, doc, getDoc, limit } = await import('firebase/firestore');

        // Check partner by email before auth
        const partnerSnap = await getDocs(
          query(collection(db, 'partners'), where('email', '==', normalizedEmail), limit(1))
        );
        if (!partnerSnap.empty) {
          // Authenticate via Firebase Auth REST
          await authRequest('signInWithPassword', {
            email: normalizedEmail, password, returnSecureToken: true,
          });
          const partnerDoc = partnerSnap.docs[0];
          await AsyncStorage.multiSet([
            ['partnerId', partnerDoc.id],
            ['partnerName', partnerDoc.data().name ?? ''],
            ['role', 'partner'],
          ]);
          router.replace('/(partner)');
          return;
        }

        // Guest sign-in via Firebase Auth REST
        const { localId } = await authRequest('signInWithPassword', {
          email: normalizedEmail, password, returnSecureToken: true,
        });

        const userDoc = await getDoc(doc(db, 'users', localId));
        const walletData = userDoc.exists() ? userDoc.data() : { name: '', email: normalizedEmail, tokenBalance: 0, pointsBalance: 0 };
        await AsyncStorage.multiSet([
          ['userId', localId],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify(walletData)],
        ]);
        // Route to activate if never activated (no checkIn stored)
        const activated = !!(walletData as any).checkIn;
        router.replace(activated ? '/(guest)' : '/activate' as any);
      } else {
        // Offline fallback
        const snapshot = await findLocalUserByEmail(email.trim().toLowerCase());
        if (!snapshot) {
          Alert.alert('Not found', 'No account with this email. Create an account first.');
          return;
        }
        await restoreUserSnapshot(snapshot);
        router.replace('/(guest)');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Sign in failed');
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
      <View style={styles.hero}>
        <Video
          source={require('../assets/bg_video.mp4')}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onReadyForDisplay={() => videoRef.current?.setPositionAsync(40000)}
          ref={videoRef}
        />
        <View style={styles.heroOverlay} />
        <Text style={styles.withUs}>WITH US</Text>
        <Text style={styles.heroTitle}>Discover{'\n'}The Jungfrau{'\n'}Region</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, !isSignIn && styles.modeBtnActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.modeBtnText, !isSignIn && styles.modeBtnTextActive]}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, isSignIn && styles.modeBtnActive]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.modeBtnText, isSignIn && styles.modeBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fields}>
            {!isSignIn && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#D1D5DB"
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#D1D5DB"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignIn ? 'Your password' : 'Min. 6 characters'}
                placeholderTextColor="#D1D5DB"
                secureTextEntry
              />
            </View>
          </View>

          <Button
            title={isSignIn ? 'Sign In' : 'Create Account'}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            loading={loading}
            style={styles.actionBtn}
          />
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
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '65%' },
  sheetContent: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40, gap: 14 },
  modeRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 14, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#111827' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeBtnTextActive: { color: '#FFFFFF' },
  fields: { gap: 12 },
  field: { gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, fontSize: 13, color: '#111827', backgroundColor: '#F9FAFB',
  },
  actionBtn: { marginTop: 4 },
});
