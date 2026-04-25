import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { saveUserSnapshot, findLocalUserByEmail, restoreUserSnapshot } from '@/lib/userStore';
import { verifyProof, getHotelPublicKey, extractProofToken } from '@/lib/voucher';
import type { ReservationData } from '@/lib/voucher';
import { DEMO_PROOF_MD } from '@/data/demoVoucher';

type Mode = 'signup' | 'signin';

export default function ActivationScreen() {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voucher, setVoucher] = useState('');
  const [voucherStatus, setVoucherStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [voucherData, setVoucherData] = useState<ReservationData | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => { setChecking(false); }, []);

  // ── Verify voucher on paste — accepts raw token OR full .md proof ────────
  const handleVerifyVoucher = async (raw: string) => {
    setVoucher(raw);
    if (!raw.trim()) {
      setVoucherStatus('idle');
      setVoucherData(null);
      return;
    }
    // Support pasting the full .md proof: extract embedded JFP-PROOF token
    const extracted = extractProofToken(raw.trim());
    const token = extracted ?? (raw.trim().includes('.') ? raw.trim() : null);
    if (!token) {
      setVoucherStatus('idle');
      setVoucherData(null);
      return;
    }
    try {
      // Decode payload (no sig verify yet) to get hotelId
      const [payload] = token.split('.');
      const decoded: ReservationData = JSON.parse(atob(payload));
      const hotelId = decoded.hotelId;

      const pubB64 = await getHotelPublicKey(hotelId);
      if (!pubB64) {
        setVoucherStatus('error');
        setVoucherError(`Clé publique introuvable pour ${hotelId}`);
        setVoucherData(null);
        return;
      }

      const result = await verifyProof(token, pubB64);
      if (result.valid && result.data) {
        setVoucherStatus('ok');
        setVoucherData(result.data);
        setName(result.data.client);
        setVoucherError('');
      } else {
        setVoucherStatus('error');
        setVoucherError(result.error ?? 'Bon invalide');
        setVoucherData(null);
      }
    } catch {
      setVoucherStatus('error');
      setVoucherError('Format de bon invalide');
      setVoucherData(null);
    }
  };

  // ── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Champs manquants', 'Remplissez tous les champs');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Minimum 6 caractères');
      return;
    }
    if (voucherStatus !== 'ok' || !voucherData) {
      Alert.alert('Bon requis', 'Collez votre bon de réservation signé par l\'hôtel');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const walletData = {
        name,
        email: normalizedEmail,
        hotelCode: voucherData.hotelId,
        tokenBalance: voucherData.tokens,
        pointsBalance: 0,
        checkInLocation: voucherData.hotel,
        checkIn: voucherData.checkIn,
        checkOut: voucherData.checkOut,
        chambre: voucherData.chambre,
      };

      if (FIREBASE_CONFIGURED && db) {
        const { collection, query, where, getDocs, addDoc, serverTimestamp, limit } = await import('firebase/firestore');
        const existing = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1)));
        if (!existing.empty) {
          Alert.alert('Compte existant', 'Un compte avec cet email existe déjà. Utilisez "Connexion".');
          return;
        }
        const docRef = await addDoc(collection(db, 'users'), {
          ...walletData, password, activatedAt: serverTimestamp(),
        });
        await AsyncStorage.multiSet([
          ['userId', docRef.id],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify(walletData)],
          ['transactions', '[]'],
        ]);
      } else {
        const existing = await findLocalUserByEmail(normalizedEmail);
        if (existing) {
          Alert.alert('Compte existant', 'Un compte avec cet email existe déjà. Utilisez "Connexion".');
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
      Alert.alert('Erreur', e.message ?? 'Inscription échouée');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign In ──────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Champs manquants', 'Entrez votre email et mot de passe');
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (FIREBASE_CONFIGURED && db) {
        const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1)));
        if (snap.empty) {
          Alert.alert('Introuvable', 'Aucun compte avec cet email. Créez un compte d\'abord.');
          return;
        }
        const userDoc = snap.docs[0];
        const userData = userDoc.data();
        if (userData.password !== password) {
          Alert.alert('Mauvais mot de passe', 'Mot de passe incorrect.');
          return;
        }
        const { password: _, activatedAt: __, ...walletData } = userData;
        await AsyncStorage.multiSet([
          ['userId', userDoc.id],
          ['role', 'guest'],
          ['wallet_data', JSON.stringify(walletData)],
        ]);
      } else {
        const snapshot = await findLocalUserByEmail(normalizedEmail);
        if (!snapshot) {
          Alert.alert('Introuvable', 'Aucun compte avec cet email.');
          return;
        }
        const wallet = JSON.parse(snapshot.wallet_data);
        if (wallet.password && wallet.password !== password) {
          Alert.alert('Mauvais mot de passe', 'Mot de passe incorrect.');
          return;
        }
        await restoreUserSnapshot(snapshot);
      }
      router.replace('/(guest)');
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Connexion échouée');
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
              <Text style={[styles.modeBtnText, !isSignIn && styles.modeBtnTextActive]}>Créer un compte</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, isSignIn && styles.modeBtnActive]} onPress={() => setMode('signin')}>
              <Text style={[styles.modeBtnText, isSignIn && styles.modeBtnTextActive]}>Connexion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fields}>
            {/* Voucher field — sign up only */}
            {!isSignIn && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Bon de réservation</Text>
                <TextInput
                  style={[
                    styles.input,
                    voucherStatus === 'ok' && styles.inputOk,
                    voucherStatus === 'error' && styles.inputErr,
                  ]}
                  value={voucher}
                  onChangeText={handleVerifyVoucher}
                  placeholder="Collez votre bon signé par l'hôtel…"
                  placeholderTextColor="#D1D5DB"
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  numberOfLines={3}
                />
                {voucherStatus === 'ok' && voucherData && (
                  <View style={styles.voucherOk}>
                    <Text style={styles.voucherOkText}>
                      ✅ {voucherData.hotel} · {voucherData.montant} {voucherData.devise}{'\n'}
                      {voucherData.checkIn} → {voucherData.checkOut} · {voucherData.tokens} 🪙
                    </Text>
                  </View>
                )}
                {voucherStatus === 'error' && (
                  <Text style={styles.voucherErr}>❌ {voucherError}</Text>
                )}
                <TouchableOpacity onPress={() => handleVerifyVoucher(DEMO_PROOF_MD)} activeOpacity={0.7}>
                  <Text style={styles.demoBtn}>⚡ Utiliser la preuve de démo (.md)</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isSignIn && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nom complet</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName}
                  placeholder="Votre nom" placeholderTextColor="#D1D5DB" autoCapitalize="words" />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="vous@exemple.com" placeholderTextColor="#D1D5DB"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Mot de passe</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                placeholder={isSignIn ? 'Votre mot de passe' : 'Min. 6 caractères'}
                placeholderTextColor="#D1D5DB" secureTextEntry />
            </View>
          </View>

          <Button
            title={isSignIn ? 'Se connecter' : 'Créer mon compte'}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            loading={loading}
            style={styles.actionBtn}
          />

          <View style={styles.partnerRow}>
            <Text style={styles.partnerText}>Vous êtes un partenaire ?</Text>
            <TouchableOpacity onPress={() => router.push('/role')}>
              <Text style={styles.partnerLink}>  Connexion ici</Text>
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
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '65%' },
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
    minHeight: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 13, color: '#111827', backgroundColor: '#F9FAFB',
  },
  inputOk:  { borderColor: '#86EFAC' },
  inputErr: { borderColor: '#FCA5A5' },
  voucherOk: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  voucherOkText: { fontSize: 12, color: '#16A34A', fontWeight: '600', lineHeight: 18 },
  voucherErr: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  actionBtn: { marginTop: 4 },
  partnerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  partnerText: { fontSize: 13, color: '#9CA3AF' },
  partnerLink: { fontSize: 13, color: '#111827', fontWeight: '700' },
  demoBtn: { fontSize: 12, color: '#6B7280', fontWeight: '600', textDecorationLine: 'underline', marginTop: 4 },
});
