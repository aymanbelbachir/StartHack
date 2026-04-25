import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, ImageBackground } from 'react-native';

interface WalletCardProps {
  tokenBalance: number;
  pointsBalance: number;
  name: string;
  location: string;
}

const CARD_IMAGES = [
  'https://images.unsplash.com/photo-1666030910636-6291b581962e?w=600&q=80',
  'https://images.unsplash.com/photo-1594987975747-b0822d768bb2?w=600&q=80',
];

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
        {/* Tokens card */}
        <View style={styles.card}>
          <ImageBackground source={{ uri: CARD_IMAGES[0] }} style={styles.cardBg} resizeMode="cover">
            <View style={styles.dim} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tokenBalance} T</Text>
            </View>
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>{name}</Text>
              <Text style={styles.overlaySub}>{location}</Text>
            </View>
          </ImageBackground>
        </View>

        {/* Points card */}
        <View style={styles.card}>
          <ImageBackground source={{ uri: CARD_IMAGES[1] }} style={styles.cardBg} resizeMode="cover">
            <View style={styles.dim} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pointsBalance} pts</Text>
            </View>
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>Discovery Points</Text>
              <Text style={styles.overlaySub}>Earn more by exploring</Text>
            </View>
          </ImageBackground>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, gap: 16 },
  card: { width: 180, height: 196, borderRadius: 24, overflow: 'hidden' },
  cardBg: { flex: 1 },
  dim: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  badge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#84CC16', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16,
    margin: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  overlayTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  overlaySub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
