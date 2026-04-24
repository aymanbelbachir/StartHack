import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useColorScheme, Alert, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { ActivityCard } from '@/components/ActivityCard';
import { ACTIVITIES } from '@/data/activities';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

export default function ActivitiesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    loadRegistered();
  }, []);

  const loadRegistered = async () => {
    const raw = await AsyncStorage.getItem('registered_activities');
    if (raw) setRegistered(new Set(JSON.parse(raw)));
  };

  const handleRegister = async (activityId: string, points: number) => {
    if (registered.has(activityId)) return;
    setLoading(activityId);
    try {
      const userId = await AsyncStorage.getItem('userId') ?? '';

      if (FIREBASE_CONFIGURED && db) {
        const { doc, updateDoc, setDoc, arrayUnion, increment } = await import('firebase/firestore');
        const userRef = doc(db, 'users', userId);
        const activityRef = doc(db, 'activities', activityId);
        await Promise.all([
          updateDoc(userRef, { pointsBalance: increment(points) }),
          setDoc(activityRef, { registeredUsers: arrayUnion(userId) }, { merge: true }),
        ]);
      } else {
        const raw = await AsyncStorage.getItem('wallet_data');
        if (raw) {
          const wallet = JSON.parse(raw);
          wallet.pointsBalance = (wallet.pointsBalance ?? 0) + points;
          await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));
        }
      }

      const newRegistered = new Set([...registered, activityId]);
      setRegistered(newRegistered);
      await AsyncStorage.setItem('registered_activities', JSON.stringify([...newRegistered]));

      Alert.alert('Registered! 🎉', `You earned +${points} discovery points!`);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Registration failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.header, { color: colors.icon }]}>
        Register for activities to earn discovery points ⭐
      </Text>
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
  content: { padding: 16, gap: 4 },
  header: { fontSize: 13, textAlign: 'center', marginBottom: 8, lineHeight: 18 },
});
