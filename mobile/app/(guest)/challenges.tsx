import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { saveUserSnapshot } from '@/lib/userStore';
import Svg, { Path } from 'react-native-svg';

// ─── challenge definitions ────────────────────────────────────────────────────
interface Challenge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  points: number;
  target: number;
  type: 'auto_payment' | 'auto_quest' | 'auto_activity' | 'auto_tokens' | 'manual_share' | 'manual_review' | 'manual_morning';
  color: string;
}

const CHALLENGES: Challenge[] = [
  { id: 'ch-pay-3',     emoji: '💳', title: 'Local Spender',      desc: 'Pay at 3 different partners this week',                        points: 50,  target: 3,   type: 'auto_payment',   color: '#2563EB' },
  { id: 'ch-quest-2',   emoji: '🗺',  title: 'Explorer',           desc: 'Discover 2 quests in the Interlaken region',                   points: 80,  target: 2,   type: 'auto_quest',     color: '#7C3AED' },
  { id: 'ch-activity',  emoji: '🎯',  title: 'Adventurer',         desc: 'Register for at least one activity',                           points: 40,  target: 1,   type: 'auto_activity',  color: '#0D9488' },
  { id: 'ch-tokens-50', emoji: '🏆',  title: 'Big Spender',        desc: 'Spend 50 tokens in one week',                                  points: 100, target: 50,  type: 'auto_tokens',    color: '#D97706' },
  { id: 'ch-share',     emoji: '📲',  title: 'Alpine Ambassador',  desc: 'Share your Jungfrau Pass with a friend via the app',           points: 45,  target: 1,   type: 'manual_share',   color: '#DB2777' },
  { id: 'ch-review',    emoji: '⭐',  title: 'Food Critic',        desc: 'Write a review for one of the partners you visited',           points: 30,  target: 1,   type: 'manual_review',  color: '#16A34A' },
  { id: 'ch-morning',   emoji: '🌅',  title: 'Alpine Early Bird',  desc: 'Open the app before 9am (Zurich time)',                        points: 25,  target: 1,   type: 'manual_morning', color: '#F59E0B' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function getWeekStart() {
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d;
}
function daysUntilReset() {
  const now = new Date();
  const next = getWeekStart();
  next.setDate(next.getDate() + 7);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 86_400_000));
}

const BackIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
  </Svg>
);

// ─── screen ───────────────────────────────────────────────────────────────────
export default function ChallengesScreen() {
  const [progress, setProgress]   = useState<Record<string, number>>({});
  const [claimed,  setClaimed]    = useState<Record<string, boolean>>({});
  const [loading,  setLoading]    = useState<string | null>(null);

  useEffect(() => { loadProgress(); }, []);

  const loadProgress = async () => {
    const [txRaw, questRaw, actRaw, claimedRaw] = await Promise.all([
      AsyncStorage.getItem('transactions'),
      AsyncStorage.getItem('discovered_quests'),
      AsyncStorage.getItem('registered_activities'),
      AsyncStorage.getItem('weekly_claimed'),
    ]);

    const weekStart = getWeekStart().getTime();
    const txs: any[]  = txRaw  ? JSON.parse(txRaw)  : [];
    const quests: string[] = questRaw ? JSON.parse(questRaw) : [];
    const acts: string[]   = actRaw   ? JSON.parse(actRaw)   : [];
    const cl: Record<string, boolean> = claimedRaw ? JSON.parse(claimedRaw) : {};

    const weekTxs = txs.filter(tx => {
      try { return new Date(tx.timestamp).getTime() >= weekStart; } catch { return false; }
    });
    const uniquePartners = new Set(weekTxs.filter(t => t.type === 'payment').map((t: any) => t.toPartnerId));
    const totalTokens    = weekTxs.filter(t => t.type === 'payment').reduce((s: number, t: any) => s + (t.amount ?? 0), 0);

    const p: Record<string, number> = {};
    for (const ch of CHALLENGES) {
      switch (ch.type) {
        case 'auto_payment':  p[ch.id] = Math.min(uniquePartners.size, ch.target); break;
        case 'auto_quest':    p[ch.id] = Math.min(quests.length, ch.target);       break;
        case 'auto_activity': p[ch.id] = Math.min(acts.length, ch.target);         break;
        case 'auto_tokens':   p[ch.id] = Math.min(totalTokens, ch.target);         break;
        default:              p[ch.id] = cl[ch.id] ? 1 : 0;
      }
    }

    setProgress(p);
    setClaimed(cl);
  };

  const awardPoints = async (ch: Challenge) => {
    const raw = await AsyncStorage.getItem('wallet_data');
    if (!raw) return;
    const w = JSON.parse(raw);
    w.pointsBalance = (w.pointsBalance ?? 0) + ch.points;
    await AsyncStorage.setItem('wallet_data', JSON.stringify(w));
    await saveUserSnapshot();
  };

  const claimManual = async (ch: Challenge, action?: () => Promise<void>) => {
    if (claimed[ch.id]) return;
    setLoading(ch.id);
    try {
      if (action) await action();
      const next = { ...claimed, [ch.id]: true };
      setClaimed(next);
      setProgress(p => ({ ...p, [ch.id]: 1 }));
      await AsyncStorage.setItem('weekly_claimed', JSON.stringify(next));
      await awardPoints(ch);
      Alert.alert('🎉 Challenge completed!', `+${ch.points} points added to your wallet.`);
    } catch {}
    setLoading(null);
  };

  const handleManualAction = async (ch: Challenge) => {
    if (ch.type === 'manual_share') {
      await claimManual(ch, async () => {
        await Share.share({ message: 'I\'m exploring the Jungfrau region with the Jungfrau Pass! 🏔 Discover exclusive activities and quests on the app.' });
      });
    } else if (ch.type === 'manual_review') {
      await claimManual(ch);
    } else if (ch.type === 'manual_morning') {
      const hour = new Date().getHours();
      if (hour >= 9) {
        Alert.alert('Too late!', 'This challenge must be claimed before 9am.');
        return;
      }
      await claimManual(ch);
    }
  };

  const totalEarned = CHALLENGES.reduce((sum, ch) => {
    const done = progress[ch.id] >= ch.target;
    return done ? sum + ch.points : sum;
  }, 0);

  const completedCount = CHALLENGES.filter(ch => (progress[ch.id] ?? 0) >= ch.target).length;

  return (
    <View style={s.container}>
      {/* header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <BackIcon />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Weekly Challenges</Text>
          <Text style={s.headerSub}>Resets in {daysUntilReset()} day{daysUntilReset() > 1 ? 's' : ''}</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{completedCount}/{CHALLENGES.length}</Text>
        </View>
      </View>

      {/* summary strip */}
      <View style={s.summaryStrip}>
        <View style={s.summaryItem}>
          <Text style={s.summaryVal}>{completedCount}</Text>
          <Text style={s.summaryLabel}>Completed</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryVal}>{CHALLENGES.length - completedCount}</Text>
          <Text style={s.summaryLabel}>Remaining</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: '#16A34A' }]}>+{totalEarned}</Text>
          <Text style={s.summaryLabel}>Points Earned</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {CHALLENGES.map(ch => {
          const prog = progress[ch.id] ?? 0;
          const done = prog >= ch.target;
          const isManual = ch.type.startsWith('manual');
          const pct = Math.min(1, prog / ch.target);

          return (
            <View key={ch.id} style={[s.card, done && s.cardDone]}>
              {/* top row */}
              <View style={s.cardTop}>
                <View style={[s.emojiBox, { backgroundColor: done ? '#F0FDF4' : ch.color + '18' }]}>
                  <Text style={s.emojiText}>{done ? '✅' : ch.emoji}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.cardTitle, done && s.cardTitleDone]}>{ch.title}</Text>
                  <Text style={s.cardDesc}>{ch.desc}</Text>
                </View>
                <View style={[s.pointsBadge, { backgroundColor: done ? '#F0FDF4' : ch.color + '18' }]}>
                  <Text style={[s.pointsText, { color: done ? '#16A34A' : ch.color }]}>+{ch.points}</Text>
                  <Text style={[s.pointsLabel, { color: done ? '#16A34A' : ch.color }]}>pts</Text>
                </View>
              </View>

              {/* progress bar */}
              {!done && (
                <View style={s.progressWrap}>
                  <View style={[s.progressTrack]}>
                    <View style={[s.progressFill, { width: `${pct * 100}%` as any, backgroundColor: ch.color }]} />
                  </View>
                  <Text style={s.progressLabel}>{prog}/{ch.target}</Text>
                </View>
              )}

              {/* claim button for manual */}
              {isManual && !done && (
                <TouchableOpacity
                  style={[s.claimBtn, { backgroundColor: ch.color }, loading === ch.id && { opacity: 0.6 }]}
                  onPress={() => handleManualAction(ch)}
                  disabled={loading === ch.id}
                  activeOpacity={0.85}
                >
                  <Text style={s.claimBtnText}>
                    {loading === ch.id ? 'Processing…' :
                      ch.type === 'manual_share'   ? '📲 Share Now' :
                      ch.type === 'manual_review'  ? '⭐ Write a Review' :
                      '🌅 Claim (before 9am)'}
                  </Text>
                </TouchableOpacity>
              )}

              {done && (
                <View style={s.doneRow}>
                  <Text style={s.doneText}>✓ Completed · +{ch.points} points earned</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  headerSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  headerBadge: { backgroundColor: '#111827', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  headerBadgeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  summaryStrip: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDivider: { width: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  summaryVal:   { fontSize: 22, fontWeight: '800', color: '#111827' },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  list: { paddingHorizontal: 16, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    borderWidth: 1.5, borderColor: '#F3F4F6',
  },
  cardDone: { borderColor: '#BBF7D0', backgroundColor: '#FAFFFE' },

  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emojiText:{ fontSize: 24 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardTitleDone: { color: '#6B7280' },
  cardDesc:      { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },
  pointsBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 48 },
  pointsText:  { fontSize: 15, fontWeight: '800' },
  pointsLabel: { fontSize: 9, fontWeight: '600', marginTop: -1 },

  progressWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 999, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 999 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', minWidth: 28, textAlign: 'right' },

  claimBtn:    { borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  claimBtnText:{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  doneRow:  { alignItems: 'center' },
  doneText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
});
