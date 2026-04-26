import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView,
  ActivityIndicator, Alert, SafeAreaView, FlatList, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_W - 48 - 12) / 3;

const BANNER_URL =
  'https://media.jungfrau.ch/image/upload/ar_16:9,c_crop,f_auto,q_auto/c_scale,w_800/v1/Jungfraubahn/Jungfraujoch/Jungfraujoch_Top_of_Europe/jungfraujoch-top-of-europe-sphinx-terrace.jpg';

interface Entry {
  userId: string;
  name: string;
  photoBase64: string;
  submittedAt: number;
}

export default function CompetitionScreen() {
  const router = useRouter();

  const [userId, setUserId]           = useState<string | null>(null);
  const [userName, setUserName]       = useState('Guest');
  const [myEntry, setMyEntry]         = useState<Entry | null>(null);
  const [entries, setEntries]         = useState<Entry[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // ── load current user
  useEffect(() => {
    (async () => {
      const id  = await AsyncStorage.getItem('userId');
      const raw = await AsyncStorage.getItem('wallet_data');
      if (id) setUserId(id);
      if (raw) {
        const w = JSON.parse(raw);
        setUserName(w.name ?? 'Guest');
      }
    })();
  }, []);

  // ── fetch all entries from Firestore (or offline cache)
  const fetchEntries = useCallback(async () => {
    setLoadingFeed(true);
    try {
      if (FIREBASE_CONFIGURED && db) {
        const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
        const q = query(collection(db, 'competitionEntries'), orderBy('submittedAt', 'desc'));
        const snap = await getDocs(q);
        const rows: Entry[] = snap.docs.map(d => ({ userId: d.id, ...(d.data() as Omit<Entry, 'userId'>) }));
        setEntries(rows);
        if (userId) {
          const mine = rows.find(e => e.userId === userId) ?? null;
          setMyEntry(mine);
        }
      }
    } catch (e) {
      console.warn('competition fetch error', e);
    } finally {
      setLoadingFeed(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId !== null) fetchEntries();
  }, [userId, fetchEntries]);

  // ── pick photo from camera or library
  const pickPhoto = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow access to continue.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, allowsEditing: true, aspect: [4, 3] });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    await submitPhoto(result.assets[0].base64!);
  };

  // ── submit to Firestore + award tokens
  const submitPhoto = async (base64: string) => {
    if (!userId) return;
    setUploading(true);
    try {
      const entry: Omit<Entry, 'userId'> = {
        name: userName,
        photoBase64: base64,
        submittedAt: Date.now(),
      };

      if (FIREBASE_CONFIGURED && db) {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'competitionEntries', userId), entry);
      }

      // award 50 tokens
      const raw = await AsyncStorage.getItem('wallet_data');
      if (raw) {
        const w = JSON.parse(raw);
        if (!myEntry) {
          w.tokenBalance = (w.tokenBalance ?? 0) + 50;
          await AsyncStorage.setItem('wallet_data', JSON.stringify(w));
        }
      }

      setMyEntry({ userId, ...entry });
      Alert.alert('Submitted!', myEntry ? 'Your photo has been updated.' : 'Entry submitted! +50 tokens awarded.');
      await fetchEntries();
    } catch (e) {
      Alert.alert('Error', 'Could not submit photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── render a community thumb
  const renderThumb = ({ item }: { item: Entry }) => (
    <View style={[styles.thumb, item.userId === userId && styles.thumbMine]}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${item.photoBase64}` }}
        style={styles.thumbImg}
        resizeMode="cover"
      />
      <Text style={styles.thumbName} numberOfLines={1}>{item.name}</Text>
      {item.userId === userId && <View style={styles.youBadge}><Text style={styles.youBadgeText}>You</Text></View>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* ── banner */}
        <View style={styles.bannerWrap}>
          <Image source={{ uri: BANNER_URL }} style={styles.bannerImg} resizeMode="cover" />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerLabel}>PHOTO COMPETITION</Text>
            <Text style={styles.bannerTitle}>Capture the Alps</Text>
            <Text style={styles.bannerSub}>Submit your best Jungfrau Region photo</Text>
          </View>
        </View>

        {/* ── prize card */}
        <View style={styles.prizeCard}>
          <View style={styles.prizeRow}>
            <View style={styles.prizeItem}>
              <Text style={styles.prizeValue}>+50</Text>
              <Text style={styles.prizeLabel}>Tokens on submit</Text>
            </View>
            <View style={styles.prizeDivider} />
            <View style={styles.prizeItem}>
              <Text style={styles.prizeValue}>{entries.length}</Text>
              <Text style={styles.prizeLabel}>Entries so far</Text>
            </View>
            <View style={styles.prizeDivider} />
            <View style={styles.prizeItem}>
              <Text style={styles.prizeValue}>🏆</Text>
              <Text style={styles.prizeLabel}>Best photo wins</Text>
            </View>
          </View>
          <Text style={styles.prizeDesc}>
            Share your most stunning shot from the Jungfrau Region — mountains, villages, lakes, or any hidden gem you discover. One entry per guest. Tokens are awarded instantly on submission.
          </Text>
        </View>

        {/* ── my entry / upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Entry</Text>

          {myEntry ? (
            <View style={styles.myEntryCard}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${myEntry.photoBase64}` }}
                style={styles.myEntryImg}
                resizeMode="cover"
              />
              <View style={styles.myEntryFooter}>
                <Text style={styles.myEntryStatus}>✓ Submitted — you can update it anytime</Text>
                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={() => Alert.alert('Update photo', 'Choose source', [
                    { text: 'Camera', onPress: () => pickPhoto(true) },
                    { text: 'Gallery', onPress: () => pickPhoto(false) },
                    { text: 'Cancel', style: 'cancel' },
                  ])}
                  disabled={uploading}
                >
                  {uploading
                    ? <ActivityIndicator color="#111827" size="small" />
                    : <Text style={styles.updateBtnText}>Update Photo</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.uploadCard}>
              <Text style={styles.uploadEmoji}>📷</Text>
              <Text style={styles.uploadTitle}>No entry yet</Text>
              <Text style={styles.uploadSub}>Earn 50 tokens when you submit your first photo</Text>
              <View style={styles.uploadBtns}>
                <TouchableOpacity
                  style={styles.uploadBtnPrimary}
                  onPress={() => pickPhoto(true)}
                  disabled={uploading}
                >
                  {uploading
                    ? <ActivityIndicator color="#111827" size="small" />
                    : <Text style={styles.uploadBtnPrimaryText}>Take Photo</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadBtnSecondary}
                  onPress={() => pickPhoto(false)}
                  disabled={uploading}
                >
                  <Text style={styles.uploadBtnSecondaryText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── community gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Gallery</Text>

          {loadingFeed ? (
            <View style={styles.feedLoading}>
              <ActivityIndicator color="#84CC16" size="large" />
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.feedEmpty}>
              <Text style={styles.feedEmptyText}>No entries yet — be the first!</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              renderItem={renderThumb}
              keyExtractor={e => e.userId}
              numColumns={3}
              columnWrapperStyle={styles.thumbRow}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: 16 },

  backBtn: { paddingVertical: 14 },
  backText: { fontSize: 15, fontWeight: '600', color: '#052e16' },

  bannerWrap: { borderRadius: 20, overflow: 'hidden', height: 200, marginBottom: 16 },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  bannerLabel: { fontSize: 11, fontWeight: '700', color: '#84CC16', letterSpacing: 1.5, textTransform: 'uppercase' },
  bannerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  bannerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  prizeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  prizeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  prizeItem: { flex: 1, alignItems: 'center' },
  prizeValue: { fontSize: 22, fontWeight: '800', color: '#052e16' },
  prizeLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  prizeDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },
  prizeDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12 },

  myEntryCard: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  myEntryImg:    { width: '100%', height: 200 },
  myEntryFooter: {
    backgroundColor: '#FFFFFF', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  myEntryStatus: { flex: 1, fontSize: 12, color: '#16A34A', fontWeight: '600' },
  updateBtn: {
    backgroundColor: '#84CC16', borderRadius: 999, paddingHorizontal: 16, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  updateBtnText: { fontSize: 13, fontWeight: '700', color: '#111827' },

  uploadCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  uploadEmoji: { fontSize: 40 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  uploadSub:   { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  uploadBtns:  { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  uploadBtnPrimary: {
    flex: 1, backgroundColor: '#84CC16', borderRadius: 999, height: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  uploadBtnSecondary: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 999, height: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  feedLoading: { height: 120, alignItems: 'center', justifyContent: 'center' },
  feedEmpty:   { height: 80, alignItems: 'center', justifyContent: 'center' },
  feedEmptyText: { fontSize: 14, color: '#9CA3AF' },

  thumbRow: { gap: 6, marginBottom: 6 },
  thumb: {
    width: THUMB_SIZE, borderRadius: 10, overflow: 'hidden', backgroundColor: '#E5E7EB',
  },
  thumbMine: { borderWidth: 2, borderColor: '#84CC16' },
  thumbImg:  { width: THUMB_SIZE, height: THUMB_SIZE },
  thumbName: {
    fontSize: 10, fontWeight: '600', color: '#374151',
    paddingHorizontal: 4, paddingVertical: 3, backgroundColor: '#FFFFFF',
  },
  youBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#84CC16', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2,
  },
  youBadgeText: { fontSize: 9, fontWeight: '800', color: '#111827' },
});
