import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserSnapshot } from '@/lib/userStore';
import { useWallet } from '@/hooks/useWallet';
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
const INTERLAKEN = { latitude: 46.6863, longitude: 7.8632, latitudeDelta: 0.14, longitudeDelta: 0.14 };

const PARTNER_MARKERS = [
  { id: 'partner-jungfraujoch',        name: 'Jungfraujoch Railway',    emoji: '🚂', lat: 46.5474, lon: 7.9854, color: '#2563EB' },
  { id: 'partner-victoria-restaurant', name: 'Hotel Victoria',          emoji: '🍽', lat: 46.6853, lon: 7.8671, color: '#DB2777' },
  { id: 'partner-interlaken-adventure',name: 'Interlaken Adventure',    emoji: '🏔', lat: 46.6856, lon: 7.8554, color: '#0D9488' },
  { id: 'partner-bakery',              name: 'Grindelwald Bäckerei',    emoji: '🥐', lat: 46.6241, lon: 8.0411, color: '#D97706' },
];

const ACTIVITY_MARKERS = [
  { id: 'activity-paragliding',      name: 'Paragliding',         emoji: '🪂', lat: 46.6887, lon: 7.8490 },
  { id: 'activity-eiger-trail',      name: 'Eiger Trail',         emoji: '⛰️', lat: 46.5781, lon: 8.0053 },
  { id: 'activity-glacier-walk',     name: 'Glacier Walk',        emoji: '🧊', lat: 46.6241, lon: 8.0411 },
  { id: 'activity-boat-tour',        name: 'Lake Thun Boat',      emoji: '⛵', lat: 46.7523, lon: 7.6264 },
  { id: 'activity-jungfraujoch',     name: 'Jungfraujoch',        emoji: '🏔', lat: 46.5474, lon: 7.9854 },
  { id: 'activity-schilthorn',       name: 'Schilthorn',          emoji: '🚡', lat: 46.5582, lon: 7.8389 },
  { id: 'activity-first-cliff-walk', name: 'First Cliff Walk',    emoji: '🪜', lat: 46.6467, lon: 8.0677 },
  { id: 'activity-canyon-swing',     name: 'Canyon Swing',        emoji: '🎢', lat: 46.6820, lon: 7.8510 },
  { id: 'activity-harder-kulm',      name: 'Harder Kulm',         emoji: '🌉', lat: 46.6961, lon: 7.8580 },
  { id: 'activity-lauterbrunnen',    name: 'Lauterbrunnen Valley', emoji: '💦', lat: 46.5935, lon: 7.9088 },
];

const QUEST_LOCATIONS = [
  { id: 'quest-paragliding-launch', name: 'Beatenberg Launch Site', hint: 'Paragliders take off from this ridge high above Interlaken. Find the ramp where brave souls leap into the Alps…', reward: 40, lat: 46.6887, lon: 7.8490 },
  { id: 'quest-eiger-north',        name: 'Eiger North Face',       hint: 'The most feared wall in alpine climbing. Stand at the base of this 1800m north face and feel its shadow…',     reward: 50, lat: 46.5781, lon: 8.0053 },
  { id: 'quest-grindelwald-glacier',name: 'Grindelwald Glacier',    hint: 'An ancient river of ice retreating year by year. Witness the glacier before it vanishes into history…',         reward: 45, lat: 46.6241, lon: 8.0411 },
  { id: 'quest-thun-castle',        name: 'Oberhofen Castle',       hint: 'A fairy-tale castle rising straight from the turquoise waters of Lake Thun. Spot it from the boat tour…',       reward: 35, lat: 46.7523, lon: 7.6264 },
  { id: 'quest-jungfraujoch',       name: 'Top of Europe',          hint: 'At 3,454m, the Jungfraujoch station is the highest railway station in Europe. The view of the Aletsch glacier is unforgettable…', reward: 60, lat: 46.5474, lon: 7.9854 },
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
  const [registeredActivities, setRegisteredActivities] = useState<Set<string>>(new Set());
  const [discoveredQuests, setDiscoveredQuests] = useState<Set<string>>(new Set());
  const [questModal, setQuestModal] = useState<typeof QUEST_LOCATIONS[0] | null>(null);
  const { wallet, refresh } = useWallet(userId);
  const weather = useWeather();
  const mapRef = useRef<MapView>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('userId').then((id) => {
        setUserId(id);
        if (id) refresh();
      });
      // reload registered activities + quests every time tab is focused
      AsyncStorage.getItem('registered_activities').then(raw => {
        if (raw) setRegisteredActivities(new Set(JSON.parse(raw)));
      });
      AsyncStorage.getItem('discovered_quests').then(raw => {
        if (raw) setDiscoveredQuests(new Set(JSON.parse(raw)));
      });
    }, [refresh])
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.12, longitudeDelta: 0.12 }, 800);
    })();
  }, []);

  const centerOnUser = () => {
    const target = userLocation ?? { latitude: INTERLAKEN.latitude, longitude: INTERLAKEN.longitude };
    mapRef.current?.animateToRegion({ ...target, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 600);
  };

  const handleQuestPress = (quest: typeof QUEST_LOCATIONS[0]) => {
    if (discoveredQuests.has(quest.id)) {
      Alert.alert(`✅ ${quest.name}`, `Already discovered! You earned ${quest.reward} pts.`);
      return;
    }
    setQuestModal(quest);
  };

  const confirmDiscover = async () => {
    if (!questModal) return;
    const next = new Set([...discoveredQuests, questModal.id]);
    setDiscoveredQuests(next);
    await AsyncStorage.setItem('discovered_quests', JSON.stringify([...next]));
    // award points
    const raw = await AsyncStorage.getItem('wallet_data');
    if (raw) {
      const w = JSON.parse(raw);
      w.pointsBalance = (w.pointsBalance ?? 0) + questModal.reward;
      await AsyncStorage.setItem('wallet_data', JSON.stringify(w));
    }
    await saveUserSnapshot();
    setQuestModal(null);
    Alert.alert('🗺 Location Discovered!', `+${questModal.reward} discovery points added to your wallet.`);
  };

  const name = wallet?.name ?? 'Guest';
  const balance = wallet?.tokenBalance ?? 50;
  const initial = name.charAt(0).toUpperCase();

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
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lon }} title={p.name}>
            <View>
              <View style={[styles.markerBubble, { backgroundColor: p.color }]}>
                <Text style={styles.markerEmoji}>{p.emoji}</Text>
              </View>
              <View style={[styles.markerTail, { borderTopColor: p.color }]} />
            </View>
          </Marker>
        ))}

        {/* Activity markers — green when booked */}
        {ACTIVITY_MARKERS.map(a => {
          const booked = registeredActivities.has(a.id);
          return (
            <Marker
              key={a.id}
              coordinate={{ latitude: a.lat, longitude: a.lon }}
              title={a.name}
              onPress={() => router.push('/(guest)/activities' as any)}
            >
              <View style={[styles.actMarker, booked && styles.actMarkerBooked]}>
                {booked
                  ? <Text style={styles.actMarkerCheck}>✓</Text>
                  : <Text style={{ fontSize: 17 }}>{a.emoji}</Text>
                }
              </View>
              {booked && <View style={styles.actTail} />}
            </Marker>
          );
        })}

        {/* Quest markers */}
        {QUEST_LOCATIONS.map(q => {
          const done = discoveredQuests.has(q.id);
          return (
            <Marker
              key={q.id}
              coordinate={{ latitude: q.lat, longitude: q.lon }}
              title={done ? q.name : '???'}
              onPress={() => handleQuestPress(q)}
            >
              <View>
                <View style={[styles.questMarker, done && styles.questMarkerDone]}>
                  <Text style={styles.questText}>{done ? '★' : '?'}</Text>
                </View>
                <View style={[styles.markerTail, { borderTopColor: done ? '#84CC16' : '#7C3AED' }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Top header overlay ── */}
      <View style={styles.topOverlay}>
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.avatarCircle} onPress={() => router.push('/(guest)/profile' as any)} activeOpacity={0.8}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.headerName}>Hi, {name}</Text>
              {weather && <Text style={styles.headerWeather}>{weather.emoji} {weather.temp}°C · Interlaken</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.questBadge}>
              <Text style={styles.questBadgeText}>⭐ {discoveredQuests.size}/{QUEST_LOCATIONS.length}</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn}>
              <BellIcon />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Legend ── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#14532D' }]} /><Text style={styles.legendText}>Activity</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#84CC16' }]} /><Text style={styles.legendText}>Booked</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} /><Text style={styles.legendText}>Quest</Text></View>
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
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <View style={styles.balanceAmt}>
              <Text style={styles.balanceNum}>{balance}</Text>
              <Text style={styles.balanceCoin}>🪙 tokens</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.payBtn} onPress={() => router.push('/(guest)/scan' as any)} activeOpacity={0.85}>
            <Text style={styles.payBtnText}>Pay / Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Quest discovery modal ── */}
      <Modal visible={!!questModal} transparent animationType="slide" onRequestClose={() => setQuestModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setQuestModal(null)} />
        <View style={styles.questModal}>
          <View style={styles.questModalIcon}>
            <Text style={styles.questModalQ}>?</Text>
          </View>
          <Text style={styles.questModalTitle}>Unknown Location</Text>
          <Text style={styles.questModalHint}>{questModal?.hint}</Text>
          <View style={styles.questModalReward}>
            <Text style={styles.questModalRewardText}>+{questModal?.reward} discovery points</Text>
          </View>
          <TouchableOpacity style={styles.discoverBtn} onPress={confirmDiscover} activeOpacity={0.85}>
            <Text style={styles.discoverBtnText}>🗺 Discover this place</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setQuestModal(null)}>
            <Text style={styles.cancelText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // partner markers
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

  // activity markers
  actMarker: {
    backgroundColor: '#FFFFFF', borderRadius: 999, width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#D1D5DB',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3,
  },
  actMarkerBooked: { backgroundColor: '#14532D', borderColor: '#84CC16', borderWidth: 2.5 },
  actMarkerCheck: { fontSize: 16, fontWeight: '900', color: '#84CC16' },
  actTail: {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#14532D',
  },

  // quest markers
  questMarker: {
    width: 36, height: 36, borderRadius: 999, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#7C3AED', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  questMarkerDone: { backgroundColor: '#14532D' },
  questText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },

  // top overlay
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
  },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  headerWeather: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  questBadge: { backgroundColor: '#F3F0FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  questBadgeText: { fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  bellBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  // legend
  legend: {
    position: 'absolute', top: 135, right: 16,
    backgroundColor: 'rgba(255,255,255,0.93)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#374151', fontWeight: '500' },

  // locate button
  locBtn: {
    position: 'absolute', right: 16, bottom: 175,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },

  // bottom card
  bottomCard: {
    position: 'absolute', bottom: 72, left: 16, right: 16,
    backgroundColor: '#FFFFFF', borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5 },
  balanceAmt: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  balanceNum: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -1 },
  balanceCoin: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  payBtn: { backgroundColor: '#14532D', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 },
  payBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

  // quest modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  questModal: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 44, alignItems: 'center', gap: 12,
  },
  questModalIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  questModalQ: { fontSize: 36, fontWeight: '900', color: '#FFFFFF' },
  questModalTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  questModalHint: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, maxWidth: 300 },
  questModalReward: {
    backgroundColor: '#F3F0FF', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
  },
  questModalRewardText: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  discoverBtn: {
    width: '100%', backgroundColor: '#14532D', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  discoverBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  cancelText: { fontSize: 13, color: '#9CA3AF', paddingVertical: 4 },
});
