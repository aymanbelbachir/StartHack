import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { StackActions } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';

const UserIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke="#84CC16" strokeWidth="1.8" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#84CC16" strokeWidth="1.8" strokeLinecap="round" />
  </Svg>
);

const LogOutIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 17l5-5-5-5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 12H9" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export default function AccountScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      const [id, name, em] = await Promise.all([
        AsyncStorage.getItem('partnerId'),
        AsyncStorage.getItem('partnerName'),
        AsyncStorage.getItem('userEmail'),
      ]);
      setPartnerId(id ?? '');
      setPartnerName(name ?? '');
      setEmail(em ?? '');
    })();
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove([
            'partnerId', 'partnerName', 'role', 'partner_current_price', 'userEmail',
          ]);
          const rootNav = navigation.getParent() ?? navigation;
          rootNav.dispatch(StackActions.replace('index'));
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <UserIcon />
        </View>
        <Text style={styles.name}>{partnerName || '—'}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>Partner</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account details</Text>
        <InfoRow label="Business name" value={partnerName || '—'} />
        <View style={styles.divider} />
        <InfoRow label="Partner ID" value={partnerId || '—'} mono />
        {email ? (
          <>
            <View style={styles.divider} />
            <InfoRow label="Email" value={email} />
          </>
        ) : null}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
        <LogOutIcon />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Jungfrau Pass · StartHack 2026</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingHorizontal: 20, paddingBottom: 120, gap: 20 },

  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#84CC16',
  },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  rolePill: {
    backgroundColor: '#ECFCCB', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: '#3F6212', letterSpacing: 0.5 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#111827', maxWidth: '55%', textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  version: { fontSize: 11, color: '#D1D5DB', textAlign: 'center', paddingBottom: 8 },
});
