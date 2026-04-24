import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { Activity } from '@/data/activities';

interface ActivityCardProps {
  activity: Activity;
  registered?: boolean;
  onRegister?: () => void;
}

export function ActivityCard({ activity, registered = false, onRegister }: ActivityCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{activity.imageEmoji}</Text>
        <View style={styles.meta}>
          <Text style={[styles.category, { color: colors.primary, backgroundColor: colors.primary + '20' }]}>
            {activity.category}
          </Text>
          <Text style={[styles.duration, { color: colors.icon }]}>⏱ {activity.duration}</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{activity.title}</Text>
      <Text style={[styles.description, { color: colors.icon }]}>{activity.description}</Text>
      <View style={styles.footer}>
        <Text style={[styles.points, { color: colors.points }]}>+{activity.pointsReward} pts ⭐</Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: registered ? colors.success : colors.accent }]}
          onPress={!registered ? onRegister : undefined}
          disabled={registered}
        >
          <Text style={styles.btnText}>{registered ? '✓ Registered' : 'Register'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emoji: { fontSize: 36 },
  meta: { alignItems: 'flex-end', gap: 4 },
  category: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  duration: { fontSize: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  points: { fontSize: 15, fontWeight: '700' },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
