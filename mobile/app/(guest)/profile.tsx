import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Image, Switch, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { StackActions } from '@react-navigation/native';
import { ACTIVITIES } from '@/data/activities';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { saveUserSnapshot } from '@/lib/userStore';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── icons ────────────────────────────────────────────────────────────────────
const ChevronRight = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);
const CameraIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#111827" strokeWidth="2" />
    <Circle cx="12" cy="13" r="4" stroke="#111827" strokeWidth="2" />
  </Svg>
);

// ─── edit modal ───────────────────────────────────────────────────────────────
function EditModal({
  visible, title, value, onClose, onSave, secure = false, keyboardType = 'default',
}: {
  visible: boolean; title: string; value: string;
  onClose: () => void; onSave: (v: string) => void;
  secure?: boolean; keyboardType?: any;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput
            style={styles.modalInput}
            value={draft}
            onChangeText={setDraft}
            secureTextEntry={secure}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={() => { onSave(draft); onClose(); }}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── section header ───────────────────────────────────────────────────────────
const Section = ({ title }: { title: string }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// ─── row ──────────────────────────────────────────────────────────────────────
function Row({ label, value, onPress, danger = false }: {
  label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
        {onPress && <ChevronRight />}
      </View>
    </TouchableOpacity>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const navigation = useNavigation();
  const [wallet, setWallet] = useState<any>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [editModal, setEditModal] = useState<'name' | 'email' | 'password' | null>(null);

  const load = useCallback(async () => {
    const [raw, photo, acts] = await Promise.all([
      AsyncStorage.getItem('wallet_data'),
      AsyncStorage.getItem('profile_photo'),
      AsyncStorage.getItem('registered_activities'),
    ]);
    if (raw) setWallet(JSON.parse(raw));
    if (photo) setPhotoUri(photo);
    if (acts) setRegisteredIds(new Set(JSON.parse(acts)));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── photo picker ──────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo access to change your picture'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await AsyncStorage.setItem('profile_photo', uri);
    }
  };

  // ── save field ────────────────────────────────────────────────────────────
  const saveField = async (field: string, value: string) => {
    if (!value.trim()) return;
    const updated = { ...wallet, [field]: value.trim() };
    setWallet(updated);
    await AsyncStorage.setItem('wallet_data', JSON.stringify(updated));
    // Sync to Firestore
    if (FIREBASE_CONFIGURED && db) {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', userId), { [field]: value.trim() });
      }
    }
    await saveUserSnapshot();
  };

  // ── sign out ──────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['userId', 'role', 'wallet_data', 'transactions',
            'registered_activities', 'discovered_quests', 'redeemed_benefits',
            'partner_balances', 'profile_photo']);
          // Navigate at the root Stack level so we escape the (guest) Tabs context
          const rootNav = navigation.getParent() ?? navigation;
          rootNav.dispatch(StackActions.replace('index'));
        },
      },
    ]);
  };

  // ── donation ──────────────────────────────────────────────────────────────
  const handleDonate = () => {
    Alert.alert(
      '🌱 Plant a Tree',
      'For every 10 tokens donated, we plant one tree in the Jungfrau region. Current balance: ' + (wallet?.tokenBalance ?? 0) + ' tokens.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Donate 10 tokens',
          onPress: async () => {
            if (!wallet || wallet.tokenBalance < 10) { Alert.alert('Not enough tokens'); return; }
            const updated = { ...wallet, tokenBalance: wallet.tokenBalance - 10 };
            setWallet(updated);
            await AsyncStorage.setItem('wallet_data', JSON.stringify(updated));
            await saveUserSnapshot();
            Alert.alert('🌳 Thank you!', 'A tree will be planted in your name in the Bernese Alps.');
          },
        },
      ]
    );
  };

  const name = wallet?.name ?? '';
  const email = wallet?.email ?? '';
  const initial = name.charAt(0).toUpperCase() || '?';
  const bookedActivities = ACTIVITIES.filter(a => registeredIds.has(a.id));

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={styles.avatarImg} />
              : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )
            }
            <TouchableOpacity style={styles.cameraBtn} onPress={pickPhoto} activeOpacity={0.8}>
              <CameraIcon />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarName}>{name || 'Guest'}</Text>
          <Text style={styles.avatarEmail}>{email}</Text>
          <View style={styles.balancePill}>
            <Text style={styles.balancePillText}>🪙 {wallet?.tokenBalance ?? 0} tokens  ·  ⭐ {wallet?.pointsBalance ?? 0} pts</Text>
          </View>
        </View>

        {/* ── Wallet ── */}
        <Section title="Wallet" />
        <View style={styles.card}>
          <Row
            label="Buy Tokens"
            value={`${wallet?.tokenBalance ?? 0} 🪙 current balance`}
            onPress={() => router.push('/(guest)/topup' as any)}
          />
        </View>

        {/* ── Stay ── */}
        {wallet?.checkIn && (
          <>
            <Section title="My Stay" />
            <View style={styles.card}>
              {wallet?.hotel && (
                <>
                  <Row label="Hotel" value={wallet.hotel} />
                  <View style={styles.divider} />
                </>
              )}
              <Row label="Ref." value={wallet?.hotelCode} />
              <View style={styles.divider} />
              <Row label="Check-in" value={wallet?.checkIn} />
              <View style={styles.divider} />
              <Row label="Check-out" value={wallet?.checkOut} />
              {wallet?.nights && (
                <>
                  <View style={styles.divider} />
                  <Row label="Duration" value={`${wallet.nights} night${wallet.nights > 1 ? 's' : ''}`} />
                </>
              )}
            </View>
          </>
        )}

        {/* ── Account ── */}
        <Section title="Account" />
        <View style={styles.card}>
          <Row label="Full Name" value={name} onPress={() => setEditModal('name')} />
          <View style={styles.divider} />
          <Row label="Email" value={email} onPress={() => setEditModal('email')} />
          <View style={styles.divider} />
          <Row label="Change Password" onPress={() => setEditModal('password')} />
        </View>

        {/* ── Preferences ── */}
        <Section title="Preferences" />
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Push Notifications</Text>
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: '#E5E7EB', true: '#84CC16' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.divider} />
          <Row label="Language" value="English" />
          <View style={styles.divider} />
          <Row label="Region" value="Jungfrau, Switzerland" />
        </View>

        {/* ── Past reservations ── */}
        <Section title={`My Reservations (${bookedActivities.length})`} />
        {bookedActivities.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No bookings yet — explore the Activities tab!</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {bookedActivities.map((a, i) => (
              <View key={a.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.activityRow}>
                  <View style={styles.activityEmoji}>
                    <Text style={{ fontSize: 20 }}>{a.imageEmoji}</Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{a.title}</Text>
                    <Text style={styles.activityMeta}>{a.location} · {a.duration}</Text>
                  </View>
                  <View style={styles.bookedBadge}>
                    <Text style={styles.bookedBadgeText}>✓ Booked</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Support ── */}
        <Section title="Support & Giving" />
        <View style={styles.card}>
          <Row label="🌱 Plant a Tree (10 tokens)" onPress={handleDonate} />
          <View style={styles.divider} />
          <Row label="Help & FAQ" onPress={() => Alert.alert('Help', 'Contact us at support@jungfraupass.ch')} />
          <View style={styles.divider} />
          <Row label="Privacy Policy" onPress={() => Alert.alert('Privacy', 'Your data is stored securely and never sold.')} />
        </View>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Jungfrau Pass v1.0 · StartHack 2026</Text>

      </ScrollView>

      {/* Edit modals */}
      <EditModal
        visible={editModal === 'name'} title="Change Name" value={name}
        onClose={() => setEditModal(null)} onSave={(v) => saveField('name', v)}
      />
      <EditModal
        visible={editModal === 'email'} title="Change Email" value={email}
        onClose={() => setEditModal(null)} onSave={(v) => saveField('email', v)}
        keyboardType="email-address"
      />
      <EditModal
        visible={editModal === 'password'} title="New Password" value=""
        onClose={() => setEditModal(null)} onSave={(v) => saveField('password', v)}
        secure
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    backgroundColor: '#0D2818', paddingTop: 56, paddingBottom: 16,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  scroll: { flex: 1 },
  content: { paddingBottom: 40 },

  avatarSection: { backgroundColor: '#0D2818', alignItems: 'center', paddingBottom: 28, paddingTop: 8, gap: 6 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatarImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: '#84CC16' },
  avatarFallback: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#0F766E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#84CC16',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#84CC16', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0D2818',
  },
  avatarName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  avatarEmail: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  balancePill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, marginTop: 4 },
  balancePillText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, textTransform: 'uppercase' },

  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 16 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
  rowLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rowLabelDanger: { color: '#EF4444' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, color: '#9CA3AF', maxWidth: 160 },

  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  activityEmoji: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  activityMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  bookedBadge: { backgroundColor: '#F0FDF4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  bookedBadgeText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  emptyCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 20,
    padding: 24, alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  signOutBtn: {
    marginHorizontal: 16, marginTop: 24, backgroundColor: '#FEF2F2',
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  version: { fontSize: 11, color: '#D1D5DB', textAlign: 'center', marginTop: 16, paddingBottom: 20 },

  // Edit modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalInput: {
    height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 16, fontSize: 16, color: '#111827', backgroundColor: '#F9FAFB',
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalSave: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
