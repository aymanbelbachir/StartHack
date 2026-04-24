import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/Button';

export default function LandingScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>SH</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>StartHack</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          Your hackathon companion
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Get Started"
          onPress={() => router.push('/(auth)/register')}
          style={styles.button}
        />
        <Button
          title="Sign In"
          onPress={() => router.push('/(auth)/login')}
          variant="outline"
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    paddingBottom: 32,
  },
  button: {
    width: '100%',
  },
});
