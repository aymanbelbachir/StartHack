import React, { useState } from 'react';
import { ScrollView, StyleSheet, useColorScheme, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { ActivityCard } from '@/components/ActivityCard';
import { ACTIVITIES } from '@/data/activities';

export default function ActivitiesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [registered, setRegistered] = useState<Set<string>>(new Set());

  const handleRegister = (activityId: string, points: number) => {
    setRegistered((prev) => new Set([...prev, activityId]));
    Alert.alert('Registered! 🎉', `You earned +${points} discovery points!`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {ACTIVITIES.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          registered={registered.has(activity.id)}
          onRegister={() => handleRegister(activity.id, activity.pointsReward)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
});
