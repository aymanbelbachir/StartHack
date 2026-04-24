import React from 'react';
import { View, Text, StyleSheet, useColorScheme, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('auth_token');
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>H</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>Haytam</Text>
        <Text style={[styles.email, { color: colors.icon }]}>haytam@starthack.com</Text>
      </View>

      <Card style={styles.statsCard}>
        {[
          { label: 'Hackathons Joined', value: '7' },
          { label: 'Projects Built', value: '12' },
          { label: 'Prizes Won', value: '3' },
        ].map((item) => (
          <View key={item.label} style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{item.value}</Text>
          </View>
        ))}
      </Card>

      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  avatarSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 32, gap: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '700' },
  email: { fontSize: 14 },
  statsCard: { gap: 12, marginBottom: 24 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 16, fontWeight: '700' },
  logoutBtn: { marginTop: 'auto' },
});
