import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';

interface WalletCardProps {
  tokenBalance: number;
  pointsBalance: number;
  name: string;
  location: string;
}

export function WalletCard({ tokenBalance, pointsBalance, name, location }: WalletCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.card}>
          <View style={[styles.cardBg, { backgroundColor: '#14532D' }]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tokenBalance} T</Text>
            </View>
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>{name}</Text>
              <Text style={styles.overlaySub}>{location}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={[styles.cardBg, { backgroundColor: '#0F766E' }]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pointsBalance} pts</Text>
            </View>
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>Discovery Points</Text>
              <Text style={styles.overlaySub}>Earn more by exploring</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 16 },
  card: { width: 180, height: 196, borderRadius: 24, overflow: 'hidden' },
  cardBg: { flex: 1 },
  badge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#84CC16', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    margin: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  overlayTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  overlaySub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
