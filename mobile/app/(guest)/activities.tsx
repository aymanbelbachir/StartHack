import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Alert, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityCard } from '@/components/ActivityCard';
import { ACTIVITIES } from '@/data/activities';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { saveUserSnapshot } from '@/lib/userStore';

export default function ActivitiesScreen() {
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    loadRegistered();
  }, []);

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
      const userId = await AsyncStorage.getItem('userId') ?? '';

      if (userId && FIREBASE_CONFIGURED && db) {
        const { doc, updateDoc, setDoc, arrayUnion, increment } = await import('firebase/firestore');
        await Promise.all([
          updateDoc(doc(db, 'users', userId), { pointsBalance: increment(points) }),
          setDoc(doc(db, 'activities', activityId), { registeredUsers: arrayUnion(userId) }, { merge: true }),
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
      const userId = await AsyncStorage.getItem('userId') ?? '';

      if (userId && FIREBASE_CONFIGURED && db) {
        const { doc, updateDoc, arrayRemove, increment } = await import('firebase/firestore');
        await Promise.all([
          updateDoc(doc(db, 'users', userId), { pointsBalance: increment(-points) }),
          updateDoc(doc(db, 'activities', activityId), { registeredUsers: arrayRemove(userId) }),
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.sub}>Register to earn discovery points</Text>
      </View>

      {ACTIVITIES.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          registered={registered.has(activity.id)}
          loading={loading === activity.id}
          onRegister={() => handleRegister(activity.id, activity.pointsReward)}
          onUnregister={() => handleUnregister(activity.id, activity.pointsReward)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingHorizontal: 24, paddingBottom: 120 },
  header: { paddingTop: 60, paddingBottom: 20, gap: 4 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: '#6B7280' },
});
