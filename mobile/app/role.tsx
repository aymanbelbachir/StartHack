import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

const PARTNER_CREDENTIALS: Record<string, string> = {
  'partner-jungfraujoch': 'Jungfraujoch Railway',
  'partner-victoria-restaurant': 'Hotel Victoria Restaurant',
  'partner-interlaken-adventure': 'Interlaken Adventure Sports',
  'partner-bakery': 'Grindelwald Bäckerei',
};

const PARTNER_TYPES: Record<string, string> = {
  'partner-jungfraujoch': 'Transport',
  'partner-victoria-restaurant': 'Restaurant',
  'partner-interlaken-adventure': 'Activity',
  'partner-bakery': 'Food & Drink',
};

export default function RoleScreen() {
  const [partnerId, setPartnerId] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePartnerLogin = async () => {
    const pid = partnerId.trim().toLowerCase();
    const name = PARTNER_CREDENTIALS[pid];
    if (!name) { Alert.alert('Invalid ID', 'Partner ID not found'); return; }
    setLoading(true);
    try {
      // Register / update partner doc in Firestore so guest list is live
      if (FIREBASE_CONFIGURED && db) {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'partners', pid), {
          name,
          type: PARTNER_TYPES[pid] ?? 'Partner',
        }, { merge: true });
      }
      await AsyncStorage.setItem('partnerId', pid);
      await AsyncStorage.setItem('partnerName', name);
      await AsyncStorage.setItem('role', 'partner');
      router.replace('/(partner)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heroLabel}>PARTNER ACCESS</Text>
        <Text style={styles.heroTitle}>Partner{'\n'}Login</Text>
      </View>

      {/* White sheet */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>Enter your partner ID</Text>
          <Text style={styles.sheetSub}>Access the partner dashboard to track transactions and confirm redemptions.</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Partner ID</Text>
            <TextInput
              style={styles.input}
              value={partnerId}
              onChangeText={setPartnerId}
              placeholder="e.g. partner-bakery"
              placeholderTextColor="#D1D5DB"
              autoCapitalize="none"
            />
          </View>

          <Button title="Access Dashboard" onPress={handlePartnerLogin} loading={loading} />

          <View style={styles.hintCard}>
            <Text style={styles.hintTitle}>Demo Partner IDs</Text>
            {Object.entries(PARTNER_CREDENTIALS).map(([id, name]) => (
              <TouchableOpacity key={id} onPress={() => setPartnerId(id)} style={styles.hintRow}>
                <Text style={styles.hintName}>{name}</Text>
                <Text style={styles.hintId}>{id}</Text>
              </TouchableOpacity>
            ))}
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
  backBtn: { position: 'absolute', top: 56, left: 32 },
  backText: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  heroLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11,
    fontWeight: '700', letterSpacing: 5, marginBottom: 14,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 50, fontWeight: '800', lineHeight: 56 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    maxHeight: '60%',
  },
  sheetContent: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 40, gap: 16 },
  sheetTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sheetSub: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginTop: -4 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.3 },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
  hintCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 4 },
  hintTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  hintRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  hintName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  hintId: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
});
