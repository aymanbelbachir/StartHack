import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { Activity } from '@/data/activities';

interface ActivityCardProps {
  activity: Activity;
  registered?: boolean;
  onRegister?: () => void;
}

const CATEGORY_BG: Record<string, string> = {
  Adventure: '#14532D',
  Hiking:    '#0F766E',
  Nature:    '#065F46',
  Leisure:   '#1D4ED8',
};

export function ActivityCard({ activity, registered = false, onRegister }: ActivityCardProps) {
  const heroBg = CATEGORY_BG[activity.category] ?? '#14532D';

  return (
    <View style={styles.card}>
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
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{activity.title}</Text>

        <View style={styles.stats}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Location</Text>
            <Text style={styles.statValue}>{activity.location}</Text>
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

        <TouchableOpacity
          style={[styles.btn, registered && styles.btnDone]}
          onPress={!registered ? onRegister : undefined}
          disabled={registered}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnText, registered && styles.btnDoneText]}>
            {registered ? '✓ Registered' : 'Register'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  content: { padding: 16, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  stats: { flexDirection: 'row', gap: 8 },
  statPill: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 10, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  statValue: { fontSize: 12, fontWeight: '600', color: '#111827', marginTop: 2 },
  statLime: { color: '#65A30D' },
  description: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  btn: { backgroundColor: '#84CC16', borderRadius: 999, height: 48, alignItems: 'center', justifyContent: 'center' },
  btnDone: { backgroundColor: '#F3F4F6' },
  btnText: { color: '#111827', fontSize: 14, fontWeight: '700' },
  btnDoneText: { color: '#9CA3AF' },
});
