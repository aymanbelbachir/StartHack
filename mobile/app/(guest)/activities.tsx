import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView, StyleSheet, Alert, View, Text,
  Modal, TouchableOpacity, Image, ActivityIndicator,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { ActivityCard } from '@/components/ActivityCard';
import { ACTIVITIES } from '@/data/activities';
import type { Activity, ActivityReview } from '@/data/activities';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { saveUserSnapshot } from '@/lib/userStore';

// ─── helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function nowDateStr() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB' }}>★</Text>
      ))}
    </Text>
  );
}

const DIFF_COLOR: Record<string, string> = {
  Easy:      '#16A34A',
  Moderate:  '#D97706',
  Strenuous: '#DC2626',
};

// ─── seed hardcoded reviews to Firestore (runs once per device) ───────────────
async function seedReviewsIfNeeded() {
  if (!FIREBASE_CONFIGURED || !db) return;
  const seeded = await AsyncStorage.getItem('reviews_seeded_v1');
  if (seeded) return;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const writes: Promise<void>[] = [];
    for (const act of ACTIVITIES) {
      for (const rev of act.reviews) {
        writes.push(
          setDoc(doc(db!, 'activities', act.id, 'reviews', rev.userId), {
            userId: rev.userId,
            name: rev.name,
            rating: rev.rating,
            text: rev.text,
            date: rev.date,
            seeded: true,
          })
        );
      }
    }
    await Promise.all(writes);
    await AsyncStorage.setItem('reviews_seeded_v1', '1');
  } catch {}
}

// ─── detail modal ─────────────────────────────────────────────────────────────
interface DetailModalProps {
  activity: Activity | null;
  visible: boolean;
  userId: string | null;
  userName: string;
  registered: boolean;
  loadingReg: boolean;
  onClose: () => void;
  onRegister: () => void;
  onUnregister: () => void;
}

function ActivityDetailModal({
  activity, visible, userId, userName,
  registered, loadingReg, onClose, onRegister, onUnregister,
}: DetailModalProps) {
  const lastActivity = useRef<Activity | null>(null);
  if (activity) lastActivity.current = activity;
  const act = activity ?? lastActivity.current;

  const [reviews, setReviews]               = useState<ActivityReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  // write-review state
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // fetch / reset when the activity changes
  useEffect(() => {
    if (!activity) return;
    setReviews([]);
    setMyRating(0);
    setMyText('');
    setUserHasReviewed(false);
    loadReviews(activity);
  }, [activity?.id]);

  const loadReviews = async (a: Activity) => {
    setLoadingReviews(true);

    if (FIREBASE_CONFIGURED && db) {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db!, 'activities', a.id, 'reviews'));
        const fetched: ActivityReview[] = snap.docs.map(d => ({
          userId: d.id,
          name:   d.data().name   ?? '',
          rating: d.data().rating ?? 0,
          text:   d.data().text   ?? '',
          date:   d.data().date   ?? '',
        }));
        setReviews(fetched);
        if (userId) setUserHasReviewed(fetched.some(r => r.userId === userId));
      } catch {
        setReviews(a.reviews);
      }
    } else {
      // offline: hardcoded + any locally saved review
      const localRaw = await AsyncStorage.getItem('user_reviews');
      const localMap: Record<string, ActivityReview> = localRaw ? JSON.parse(localRaw) : {};
      const combined = [...a.reviews];
      const localReview = localMap[a.id];
      if (localReview) {
        combined.push(localReview);
        setUserHasReviewed(true);
      }
      setReviews(combined);
    }
    setLoadingReviews(false);
  };

  const handleSubmit = async () => {
    if (!act) return;
    if (myRating === 0) {
      Alert.alert('Select a rating', 'Please tap the stars to choose a rating.');
      return;
    }
    if (myText.trim().length < 10) {
      Alert.alert('Too short', 'Write at least 10 characters to help other travellers.');
      return;
    }
    setSubmitting(true);

    const newReview: ActivityReview = {
      userId: userId ?? 'local-user',
      name:   userName || 'Anonymous',
      rating: myRating,
      text:   myText.trim(),
      date:   nowDateStr(),
    };

    try {
      if (FIREBASE_CONFIGURED && db && userId) {
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        await setDoc(doc(db!, 'activities', act.id, 'reviews', userId), {
          ...newReview,
          timestamp: serverTimestamp(),
        });
      } else {
        const localRaw = await AsyncStorage.getItem('user_reviews');
        const localMap = localRaw ? JSON.parse(localRaw) : {};
        localMap[act.id] = newReview;
        await AsyncStorage.setItem('user_reviews', JSON.stringify(localMap));
      }
      setReviews(prev => [...prev.filter(r => r.userId !== newReview.userId), newReview]);
      setUserHasReviewed(true);
      setMyText('');
      setMyRating(0);
      Alert.alert('Review posted!', 'Thank you for sharing your experience.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not post review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!act) return null;

  const diffColor = DIFF_COLOR[act.difficulty] ?? '#6B7280';
  const myReview  = reviews.find(r => r.userId === userId);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={d.container}>
        {/* top bar */}
        <View style={d.topBar}>
          <TouchableOpacity style={d.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={d.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={d.topBarTitle} numberOfLines={1}>{act.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.scroll} keyboardShouldPersistTaps="handled">

            {/* hero */}
            <View style={d.heroWrap}>
              {act.imageUrl ? (
                <Image source={{ uri: act.imageUrl }} style={d.heroImg} resizeMode="cover" />
              ) : (
                <View style={d.heroFallback}>
                  <Text style={d.heroEmoji}>{act.imageEmoji}</Text>
                </View>
              )}
              <View style={d.catBadge}>
                <Text style={d.catText}>{act.category}</Text>
              </View>
            </View>

            <View style={d.body}>
              {/* title + rating */}
              <Text style={d.title}>{act.title}</Text>
              <View style={d.ratingRow}>
                <Stars rating={act.rating} size={16} />
                <Text style={d.ratingNum}>{act.rating.toFixed(1)}</Text>
                <Text style={d.ratingCount}>· {act.reviewCount.toLocaleString()} reviews</Text>
              </View>

              {/* 4-stat grid */}
              <View style={d.grid}>
                <View style={d.gridCell}>
                  <Text style={d.gridIcon}>💰</Text>
                  <Text style={d.gridLabel}>Price</Text>
                  <Text style={d.gridValue} numberOfLines={2}>{act.price}</Text>
                </View>
                <View style={d.gridCell}>
                  <Text style={d.gridIcon}>⏱</Text>
                  <Text style={d.gridLabel}>Duration</Text>
                  <Text style={d.gridValue}>{act.duration}</Text>
                </View>
                <View style={d.gridCell}>
                  <Text style={d.gridIcon}>🧭</Text>
                  <Text style={d.gridLabel}>Difficulty</Text>
                  <Text style={[d.gridValue, { color: diffColor }]}>{act.difficulty}</Text>
                </View>
                <View style={d.gridCell}>
                  <Text style={d.gridIcon}>🎟</Text>
                  <Text style={d.gridLabel}>Slots left</Text>
                  <Text style={[d.gridValue, act.slots <= 10 ? d.slotsLow : d.slotsOk]}>
                    {act.slots}
                  </Text>
                </View>
              </View>

              {/* about */}
              <View style={d.section}>
                <Text style={d.sectionTitle}>About</Text>
                <Text style={d.sectionBody}>{act.description}</Text>
              </View>

              {/* route */}
              {act.route && (
                <View style={d.section}>
                  <Text style={d.sectionTitle}>Route & Getting There</Text>
                  <Text style={d.sectionBody}>{act.route}</Text>
                </View>
              )}

              {/* schedule */}
              <View style={d.section}>
                <Text style={d.sectionTitle}>Schedule & Info</Text>
                {act.schedule.map((item, i) => (
                  <View key={i} style={d.scheduleRow}>
                    <View style={d.scheduleDot} />
                    <Text style={d.scheduleText}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* ── reviews ─────────────────────────────────────────────── */}
              <View style={d.section}>
                <View style={d.reviewsHeader}>
                  <Text style={d.sectionTitle}>What Guests Say</Text>
                  <View style={d.reviewsRating}>
                    <Stars rating={act.rating} size={13} />
                    <Text style={d.reviewsRatingNum}>{act.rating.toFixed(1)}</Text>
                  </View>
                </View>

                {loadingReviews ? (
                  <ActivityIndicator color="#84CC16" style={{ marginVertical: 16 }} />
                ) : (
                  reviews.map((rev, i) => (
                    <View key={rev.userId ?? i} style={[d.reviewCard, rev.userId === userId && d.reviewCardMine]}>
                      <View style={d.reviewTop}>
                        <View style={[d.reviewAvatar, rev.userId === userId && d.reviewAvatarMine]}>
                          <Text style={d.reviewAvatarText}>{rev.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={d.reviewName}>{rev.name}</Text>
                            {rev.userId === userId && (
                              <View style={d.myBadge}><Text style={d.myBadgeText}>You</Text></View>
                            )}
                          </View>
                          <Stars rating={rev.rating} size={11} />
                        </View>
                        <Text style={d.reviewDate}>{rev.date}</Text>
                      </View>
                      <Text style={d.reviewText}>"{rev.text}"</Text>
                    </View>
                  ))
                )}
              </View>

              {/* ── write a review ───────────────────────────────────────── */}
              <View style={d.section}>
                <Text style={d.sectionTitle}>
                  {userHasReviewed ? 'Your Review' : 'Write a Review'}
                </Text>

                {userHasReviewed && myReview ? (
                  <View style={d.alreadyReviewed}>
                    <Text style={d.alreadyReviewedText}>
                      You posted a review for this activity. It is visible to all guests.
                    </Text>
                  </View>
                ) : (
                  <View style={d.writeSection}>
                    {/* star picker */}
                    <Text style={d.writeLabel}>Your rating</Text>
                    <View style={d.starPicker}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <TouchableOpacity key={i} onPress={() => setMyRating(i)} activeOpacity={0.7}>
                          <Text style={[d.starPickerStar, { color: i <= myRating ? '#F59E0B' : '#D1D5DB' }]}>★</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* text input */}
                    <Text style={d.writeLabel}>Your experience</Text>
                    <TextInput
                      style={d.reviewInput}
                      placeholder="Share your experience with other travellers…"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      value={myText}
                      onChangeText={setMyText}
                      maxLength={500}
                      textAlignVertical="top"
                    />
                    <Text style={d.charCount}>{myText.length}/500</Text>

                    <TouchableOpacity
                      style={[d.submitBtn, (submitting || myRating === 0) && d.submitBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={submitting || myRating === 0}
                      activeOpacity={0.85}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#111827" size="small" />
                      ) : (
                        <Text style={d.submitBtnText}>Post Review</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* reward banner */}
              <View style={d.rewardBanner}>
                <Text style={d.rewardEmoji}>🏅</Text>
                <Text style={d.rewardText}>
                  Register to earn <Text style={d.rewardPts}>+{act.pointsReward} discovery points</Text> added to your Jungfrau Pass wallet.
                </Text>
              </View>

              <View style={{ height: 24 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* sticky bottom */}
        <View style={d.footer}>
          {loadingReg ? (
            <View style={d.footerLoading}>
              <ActivityIndicator color="#6B7280" size="small" />
            </View>
          ) : registered ? (
            <View style={d.footerRegistered}>
              <View style={d.footerRegisteredBadge}>
                <Text style={d.footerRegisteredText}>✓ Registered</Text>
              </View>
              <TouchableOpacity style={d.footerUnregBtn} onPress={onUnregister} activeOpacity={0.8}>
                <Text style={d.footerUnregText}>Unregister</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={d.footerBtn} onPress={onRegister} activeOpacity={0.85}>
              <Text style={d.footerBtnText}>Register · +{act.pointsReward} pts</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────
export default function ActivitiesScreen() {
  const { openId } = useLocalSearchParams<{ openId?: string }>();

  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState<string | null>(null);
  const [selected,   setSelected]   = useState<Activity | null>(null);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [userName,   setUserName]   = useState('');

  useEffect(() => {
    loadRegistered();
    AsyncStorage.getItem('userId').then(id => setUserId(id));
    AsyncStorage.getItem('wallet_data').then(raw => {
      if (raw) setUserName(JSON.parse(raw).name ?? '');
    });
    seedReviewsIfNeeded();
  }, []);

  // open the detail modal when navigated from the map with ?openId=
  useEffect(() => {
    if (!openId) return;
    const activity = ACTIVITIES.find(a => a.id === openId);
    if (activity) setSelected(activity);
  }, [openId]);

  const loadRegistered = async () => {
    const raw = await AsyncStorage.getItem('registered_activities');
    if (raw) setRegistered(new Set(JSON.parse(raw)));
  };

  const persist = async (next: Set<string>) => {
    setRegistered(next);
    await AsyncStorage.setItem('registered_activities', JSON.stringify([...next]));
    await saveUserSnapshot();
  };

  const handleRegister = async (activityId: string, points: number) => {
    if (registered.has(activityId)) return;
    setLoading(activityId);
    try {
      const uid = await AsyncStorage.getItem('userId') ?? '';

      if (uid && FIREBASE_CONFIGURED && db) {
        const { doc, updateDoc, setDoc, arrayUnion, increment } = await import('firebase/firestore');
        await Promise.all([
          updateDoc(doc(db, 'users', uid), { pointsBalance: increment(points) }),
          setDoc(doc(db, 'activities', activityId), { registeredUsers: arrayUnion(uid) }, { merge: true }),
        ]);
      } else {
        const raw = await AsyncStorage.getItem('wallet_data');
        if (raw) {
          const wallet = JSON.parse(raw);
          wallet.pointsBalance = (wallet.pointsBalance ?? 0) + points;
          await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));
        }
      }

      await persist(new Set([...registered, activityId]));
      Alert.alert('Registered!', `You earned +${points} discovery points!`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Registration failed');
    } finally {
      setLoading(null);
    }
  };

  const handleUnregister = async (activityId: string, points: number) => {
    if (!registered.has(activityId)) return;
    setLoading(activityId);
    try {
      const uid = await AsyncStorage.getItem('userId') ?? '';

      if (uid && FIREBASE_CONFIGURED && db) {
        const { doc, updateDoc, arrayRemove, increment } = await import('firebase/firestore');
        await Promise.all([
          updateDoc(doc(db, 'users', uid), { pointsBalance: increment(-points) }),
          updateDoc(doc(db, 'activities', activityId), { registeredUsers: arrayRemove(uid) }),
        ]);
      } else {
        const raw = await AsyncStorage.getItem('wallet_data');
        if (raw) {
          const wallet = JSON.parse(raw);
          wallet.pointsBalance = Math.max(0, (wallet.pointsBalance ?? 0) - points);
          await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));
        }
      }

      const next = new Set(registered);
      next.delete(activityId);
      await persist(next);
      Alert.alert('Unregistered', 'You have been removed from this activity.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Unregistration failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.sub}>Tap an activity to learn more · Register to earn discovery points</Text>
        </View>

        {ACTIVITIES.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            registered={registered.has(activity.id)}
            loading={loading === activity.id}
            onPress={() => setSelected(activity)}
            onRegister={() => handleRegister(activity.id, activity.pointsReward)}
            onUnregister={() => handleUnregister(activity.id, activity.pointsReward)}
          />
        ))}
      </ScrollView>

      <ActivityDetailModal
        activity={selected}
        visible={!!selected}
        userId={userId}
        userName={userName}
        registered={selected ? registered.has(selected.id) : false}
        loadingReg={selected ? loading === selected.id : false}
        onClose={() => setSelected(null)}
        onRegister={() => { if (selected) handleRegister(selected.id, selected.pointsReward); }}
        onUnregister={() => { if (selected) handleUnregister(selected.id, selected.pointsReward); }}
      />
    </>
  );
}

// ─── list screen styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content:   { paddingHorizontal: 24, paddingBottom: 120 },
  header:    { paddingTop: 60, paddingBottom: 20, gap: 4 },
  title:     { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  sub:       { fontSize: 13, color: '#6B7280' },
});

// ─── detail modal styles ──────────────────────────────────────────────────────
const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText:  { fontSize: 14, color: '#374151', fontWeight: '700' },
  topBarTitle:   { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#111827', marginHorizontal: 8 },

  scroll: { paddingBottom: 40 },

  heroWrap:    { height: 220, overflow: 'hidden' },
  heroImg:     { width: '100%', height: '100%' },
  heroFallback:{ width: '100%', height: '100%', backgroundColor: '#14532D', alignItems: 'center', justifyContent: 'center' },
  heroEmoji:   { fontSize: 64 },
  catBadge: {
    position: 'absolute', bottom: 12, left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5,
  },
  catText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },

  body: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },

  title:       { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingNum:   { fontSize: 15, fontWeight: '700', color: '#111827' },
  ratingCount: { fontSize: 13, color: '#6B7280' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: {
    width: '47%', backgroundColor: '#F9FAFB', borderRadius: 16,
    padding: 14, gap: 4, borderWidth: 1, borderColor: '#F3F4F6',
  },
  gridIcon:  { fontSize: 18 },
  gridLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  gridValue: { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 },
  slotsLow:  { color: '#DC2626' },
  slotsOk:   { color: '#16A34A' },

  section:      { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  sectionBody:  { fontSize: 14, color: '#4B5563', lineHeight: 22 },

  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  scheduleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#84CC16', marginTop: 7 },
  scheduleText:{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 21 },

  reviewsHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewsRating:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewsRatingNum: { fontSize: 15, fontWeight: '700', color: '#111827' },

  reviewCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  reviewCardMine: {
    backgroundColor: '#F0FDF4', borderColor: '#BBF7D0',
  },
  reviewTop:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar:    {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#052E16', alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarMine: { backgroundColor: '#16A34A' },
  reviewAvatarText: { fontSize: 15, fontWeight: '800', color: '#84CC16' },
  reviewName:  { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  reviewDate:  { fontSize: 12, color: '#9CA3AF' },
  reviewText:  { fontSize: 13, color: '#4B5563', lineHeight: 20, fontStyle: 'italic' },
  myBadge:     { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  myBadgeText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },

  // write review
  writeSection:  { gap: 12 },
  writeLabel:    { fontSize: 13, fontWeight: '600', color: '#374151' },
  starPicker:    { flexDirection: 'row', gap: 8 },
  starPickerStar:{ fontSize: 36 },

  reviewInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 16,
    padding: 14, fontSize: 14, color: '#111827',
    minHeight: 110, backgroundColor: '#F9FAFB',
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: -4 },

  submitBtn: {
    backgroundColor: '#84CC16', borderRadius: 999, height: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#D1FAE5', opacity: 0.7 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#111827' },

  alreadyReviewed: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  alreadyReviewedText: { fontSize: 13, color: '#16A34A', fontWeight: '500', lineHeight: 20 },

  rewardBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  rewardEmoji: { fontSize: 22 },
  rewardText:  { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
  rewardPts:   { fontWeight: '800', color: '#16A34A' },

  footer: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF',
  },
  footerBtn:            { backgroundColor: '#84CC16', borderRadius: 999, height: 54, alignItems: 'center', justifyContent: 'center' },
  footerBtnText:        { fontSize: 16, fontWeight: '800', color: '#111827' },
  footerLoading:        { height: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderRadius: 999 },
  footerRegistered:     { flexDirection: 'row', gap: 10, alignItems: 'center' },
  footerRegisteredBadge:{ flex: 1, height: 54, backgroundColor: '#F0FDF4', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#BBF7D0' },
  footerRegisteredText: { fontSize: 15, fontWeight: '700', color: '#16A34A' },
  footerUnregBtn:       { height: 54, paddingHorizontal: 20, backgroundColor: '#FEF2F2', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FECACA' },
  footerUnregText:      { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
