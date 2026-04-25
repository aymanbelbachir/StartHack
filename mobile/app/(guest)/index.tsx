import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWallet } from '@/hooks/useWallet';
import { ACTIVITIES } from '@/data/activities';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── weather ─────────────────────────────────────────────────────────────────
function weatherEmoji(code: number) {
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤';
  if (code <= 48) return '🌫';
  if (code <= 67) return '🌧';
  if (code <= 77) return '🌨';
  if (code <= 82) return '🌦';
  return '⛈';
}

function useWeather() {
  const [weather, setWeather] = useState<{ temp: number; emoji: string } | null>(null);
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=46.6863&longitude=7.8632&current=temperature_2m,weathercode&timezone=Europe%2FZurich')
      .then(r => r.json())
      .then(d => setWeather({ temp: Math.round(d.current.temperature_2m), emoji: weatherEmoji(d.current.weathercode) }))
      .catch(() => {});
  }, []);
  return weather;
}

// ─── map data ─────────────────────────────────────────────────────────────────
const INTERLAKEN = { latitude: 46.6863, longitude: 7.8632, latitudeDelta: 0.12, longitudeDelta: 0.12 };

const PARTNER_MARKERS = [
  { id: 'partner-jungfraujoch', name: 'Jungfraujoch Railway', emoji: '🚂', lat: 46.5474, lon: 7.9854, color: '#2563EB' },
  { id: 'partner-victoria-restaurant', name: 'Hotel Victoria', emoji: '🍽', lat: 46.6853, lon: 7.8671, color: '#DB2777' },
  { id: 'partner-interlaken-adventure', name: 'Interlaken Adventure', emoji: '🏔', lat: 46.6856, lon: 7.8554, color: '#0D9488' },
  { id: 'partner-bakery', name: 'Grindelwald Bäckerei', emoji: '🥐', lat: 46.6241, lon: 8.0411, color: '#D97706' },
];

const ACTIVITY_MARKERS = [
  { id: 'paragliding', name: 'Paragliding', emoji: '🪂', lat: 46.6887, lon: 7.8490 },
  { id: 'eiger', name: 'Eiger Trail', emoji: '⛰️', lat: 46.5781, lon: 8.0053 },
  { id: 'glacier', name: 'Glacier Walk', emoji: '🧊', lat: 46.6241, lon: 8.0411 },
  { id: 'boat', name: 'Lake Thun Boat', emoji: '⛵', lat: 46.7523, lon: 7.6264 },
];

// ─── icons ────────────────────────────────────────────────────────────────────
const BellIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
    <Path d="M13.73 21a2 2 0 01-3.46 0" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// ─── screen ───────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const { wallet, refresh } = useWallet(userId);
  const weather = useWeather();
  const mapRef = useRef<MapView>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('userId').then((id) => {
        setUserId(id);
        if (id) refresh();
      });
    }, [refresh])
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      }, 800);
    })();
  }, []);

  const name = wallet?.name ?? 'Guest';
  const balance = wallet?.tokenBalance ?? 50;
  const initial = name.charAt(0).toUpperCase();

  const centerOnUser = () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 600);
    }
  };

  return (
    <View style={styles.container}>

      {/* ── Full-screen map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={INTERLAKEN}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
      >
        {/* Partner markers */}
        {PARTNER_MARKERS.map(p => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lon }}
            title={p.name}
          >
            <View style={[styles.markerBubble, { backgroundColor: p.color }]}>
              <Text style={styles.markerEmoji}>{p.emoji}</Text>
            </View>
            <View style={[styles.markerTail, { borderTopColor: p.color }]} />
          </Marker>
        ))}

        {/* Activity markers */}
        {ACTIVITY_MARKERS.map(a => (
          <Marker
            key={a.id}
            coordinate={{ latitude: a.lat, longitude: a.lon }}
            title={a.name}
          >
            <View style={styles.actMarker}>
              <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ── Top header overlay ── */}
      <View style={styles.topOverlay}>
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>Hi, {name}</Text>
              {weather && (
                <Text style={styles.headerWeather}>{weather.emoji} {weather.temp}°C · Interlaken</Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <BellIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Center-on-user button ── */}
      <TouchableOpacity style={styles.locBtn} onPress={centerOnUser} activeOpacity={0.85}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="4" stroke="#14532D" strokeWidth="2" />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#14532D" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>

      {/* ── Bottom wallet card ── */}
      <View style={styles.bottomCard}>
        {/* Balance row */}
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <View style={styles.balanceAmt}>
              <Text style={styles.balanceNum}>{balance}</Text>
              <Text style={styles.balanceCoin}>🪙 tokens</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={() => router.push('/(guest)/scan' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>Pay / Scan</Text>
          </TouchableOpacity>
        </View>

        {/* Quick discover strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoverRow}>
          {ACTIVITIES.map(a => (
            <TouchableOpacity
              key={a.id}
              style={styles.discoverChip}
              onPress={() => router.push('/(guest)/activities' as any)}
              activeOpacity={0.8}
            >
              {a.imageUrl && (
                <Image source={{ uri: a.imageUrl }} style={styles.chipImg} resizeMode="cover" />
              )}
              <View style={styles.chipOverlay} />
              <Text style={styles.chipText} numberOfLines={1}>{a.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // markers
  markerBubble: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  markerEmoji: { fontSize: 18 },
  markerTail: {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  actMarker: {
    backgroundColor: '#FFFFFF', borderRadius: 999, width: 34, height: 34,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },

  // top overlay
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
  },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F766E',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerWeather: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },

  // locate button
  locBtn: {
    position: 'absolute', right: 16, bottom: 260,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },

  // bottom card
  bottomCard: {
    position: 'absolute', bottom: 100, left: 16, right: 16,
    backgroundColor: '#FFFFFF', borderRadius: 24,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 10,
    gap: 14,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5 },
  balanceAmt: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  balanceNum: { fontSize: 30, fontWeight: '800', color: '#111827', letterSpacing: -1 },
  balanceCoin: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  payBtn: {
    backgroundColor: '#14532D', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12,
  },
  payBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  // discover strip
  discoverRow: { gap: 10, paddingRight: 4 },
  discoverChip: {
    width: 130, height: 70, borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  chipImg: { width: '100%', height: '100%', position: 'absolute' },
  chipOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  chipText: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    fontSize: 11, fontWeight: '700', color: '#FFFFFF',
  },
});
