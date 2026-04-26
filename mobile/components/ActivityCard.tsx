import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import type { Activity } from '@/data/activities';

interface ActivityCardProps {
  activity: Activity;
  registered?: boolean;
  loading?: boolean;
  onRegister?: () => void;
  onUnregister?: () => void;
  onPress?: () => void;
}

const CATEGORY_BG: Record<string, string> = {
  Adventure: '#14532D',
  Hiking:    '#0F766E',
  Nature:    '#065F46',
  Leisure:   '#1D4ED8',
  Iconic:    '#7C3AED',
  Scenic:    '#0369A1',
};

export function ActivityCard({ activity, registered = false, loading = false, onRegister, onUnregister, onPress }: ActivityCardProps) {
  const heroBg = CATEGORY_BG[activity.category] ?? '#14532D';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.95} style={styles.card}>
      <View style={styles.heroWrap}>
        {activity.imageUrl ? (
          <Image source={{ uri: activity.imageUrl }} style={styles.heroImg} resizeMode="cover" />
        ) : (
          <View style={[styles.heroFallback, { backgroundColor: heroBg }]}>
            <Text style={styles.heroEmoji}>{activity.imageEmoji}</Text>
          </View>
        )}
        <View style={styles.catBadge}>
          <Text style={styles.catText}>{activity.category}</Text>
        </View>
        {registered && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
        <View style={styles.detailHint}>
          <Text style={styles.detailHintText}>Tap for details</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{activity.title}</Text>

        <View style={styles.stats}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Location</Text>
            <Text style={styles.statValue} numberOfLines={1}>{activity.location}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{activity.duration}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Reward</Text>
            <Text style={[styles.statValue, styles.statLime]}>+{activity.pointsReward} pts</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>{activity.description}</Text>

        {loading ? (
          <View style={styles.btnLoading}>
            <ActivityIndicator color="#6B7280" size="small" />
          </View>
        ) : registered ? (
          <View style={styles.registeredRow}>
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredBadgeText}>✓ Registered</Text>
            </View>
            <TouchableOpacity style={styles.unregisterBtn} onPress={onUnregister} activeOpacity={0.8}>
              <Text style={styles.unregisterText}>Unregister</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={onRegister} activeOpacity={0.8}>
            <Text style={styles.btnText}>Register · +{activity.pointsReward} pts</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  heroWrap: { height: 144, overflow: 'hidden' },
  heroImg: { width: '100%', height: '100%' },
  heroFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 54 },
  catBadge: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  catText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
  checkBadge: {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: '#84CC16', borderRadius: 999, width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { fontSize: 14, fontWeight: '800', color: '#111827' },
  detailHint: {
    position: 'absolute', bottom: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  detailHintText: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  stats: { flexDirection: 'row', gap: 8 },
  statPill: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  statValue: { fontSize: 12, fontWeight: '600', color: '#111827', marginTop: 2 },
  statLime: { color: '#65A30D' },
  description: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  btn: { backgroundColor: '#84CC16', borderRadius: 999, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#111827', fontSize: 14, fontWeight: '700' },
  btnLoading: { height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderRadius: 999 },
  registeredRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  registeredBadge: {
    flex: 1, height: 48, backgroundColor: '#F0FDF4', borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  registeredBadgeText: { fontSize: 14, fontWeight: '700', color: '#16A34A' },
  unregisterBtn: {
    height: 48, paddingHorizontal: 18, backgroundColor: '#FEF2F2', borderRadius: 999,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FECACA',
  },
  unregisterText: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
});
