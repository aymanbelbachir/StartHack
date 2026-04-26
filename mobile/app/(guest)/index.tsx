import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, PanResponder, ScrollView, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserSnapshot } from '@/lib/userStore';
import { useWallet } from '@/hooks/useWallet';
import { stayStatus } from '@/lib/voucher';
import Svg, { Path, Circle } from 'react-native-svg';

const SHEET_HEIGHT = 440;
const CARD_HEIGHT  = 110;
const SHEET_COLLAPSED_OFFSET = SHEET_HEIGHT - CARD_HEIGHT;
const SHEET_EXPANDED_OFFSET  = 0;

// ─── weather ──────────────────────────────────────────────────────────────────
function weatherEmoji(code: number) {
  if (code === 0)  return '☀️';
  if (code <= 3)   return '🌤';
  if (code <= 48)  return '🌫';
  if (code <= 67)  return '🌧';
  if (code <= 77)  return '🌨';
  if (code <= 82)  return '🌦';
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

// ─── map centre — shifted east so activities appear centred ───────────────────
const INTERLAKEN = { latitude: 46.6800, longitude: 7.8400, latitudeDelta: 1.20, longitudeDelta: 1.20 };

// ─── partner markers ──────────────────────────────────────────────────────────
const PARTNER_MARKERS = [
  { id: 'partner-jungfraujoch',         name: 'Jungfraujoch Railway',       emoji: '🚂', lat: 46.6883, lon: 7.8697, color: '#2563EB' },
  { id: 'partner-victoria-restaurant',  name: 'Hotel Victoria Restaurant',  emoji: '🍽', lat: 46.6853, lon: 7.8671, color: '#DB2777' },
  { id: 'partner-interlaken-adventure', name: 'Interlaken Adventure Sports', emoji: '🏔', lat: 46.6856, lon: 7.8554, color: '#0D9488' },
  { id: 'partner-bakery',               name: 'Bäckerei Interlaken',         emoji: '🥐', lat: 46.6869, lon: 7.8621, color: '#D97706' },
  { id: 'partner-spa',                  name: 'Vital Spa & Wellness',        emoji: '🧖', lat: 46.6840, lon: 7.8590, color: '#7C3AED' },
];

// ─── activity markers ─────────────────────────────────────────────────────────
const ACTIVITY_MARKERS = [
  { id: 'activity-paragliding',      name: 'Paragliding Beatenberg',  emoji: '🪂', lat: 46.6897, lon: 7.8490 },
  { id: 'activity-harder-kulm',      name: 'Harder Kulm',             emoji: '🌄', lat: 46.6961, lon: 7.8580 },
  { id: 'activity-canyon-swing',     name: 'Canyon Swing',            emoji: '🎢', lat: 46.6742, lon: 7.8672 },
  { id: 'activity-skydiving',        name: 'Skydiving Interlaken',    emoji: '🪂', lat: 46.6713, lon: 7.8782 },
  { id: 'activity-heimwehfluh',      name: 'Heimwehfluh Toboggan',    emoji: '🛷', lat: 46.6778, lon: 7.8524 },
  { id: 'activity-aare-rafting',     name: 'Aare River Rafting',      emoji: '🚣', lat: 46.6920, lon: 7.8670 },
  { id: 'activity-boat-brienz',      name: 'Lake Brienz Boat Tour',   emoji: '⛵', lat: 46.7150, lon: 7.9400 },
  { id: 'activity-sup-thun',         name: 'Lake Thun SUP',           emoji: '🏄', lat: 46.7050, lon: 7.7700 },
  { id: 'activity-kayak',            name: 'Kayak on Lake Brienz',    emoji: '🛶', lat: 46.7230, lon: 7.9100 },
  { id: 'activity-schynige-platte',  name: 'Schynige Platte Railway', emoji: '🚞', lat: 46.6614, lon: 7.9039 },
  { id: 'activity-lauterbrunnen',    name: 'Lauterbrunnen Waterfalls',emoji: '💦', lat: 46.5935, lon: 7.9088 },
  { id: 'activity-first-cliff',      name: 'First Cliff Walk',        emoji: '🪜', lat: 46.6467, lon: 8.0677 },
  { id: 'activity-eiger-trail',      name: 'Eiger Trail',             emoji: '⛰️', lat: 46.5781, lon: 8.0053 },
  { id: 'activity-jungfraujoch',     name: 'Jungfraujoch Summit',     emoji: '🏔', lat: 46.5474, lon: 7.9854 },
];

// ─── types ────────────────────────────────────────────────────────────────────
interface ConvChoice { label: string; next: number | 'done' }
interface ConvStep   { text: string; choices: ConvChoice[] }
interface CharData   { emoji: string; name: string; title: string; color: string; steps: ConvStep[] }
interface QuestLocation {
  id: string; name: string; lat: number; lon: number;
  reward: number; rewardTokens?: number; isSpot?: boolean;
}

// ─── quest characters ─────────────────────────────────────────────────────────
const CHARACTERS: Record<string, CharData> = {
  'quest-harder-kulm': {
    emoji: '🧝', name: 'Gipfel', title: 'Spirit of Harder Kulm', color: '#2563EB',
    steps: [
      { text: "Ha! A visitor! I am Gipfel, guardian of this summit for two centuries. What brings you here?", choices: [{ label: "I'm looking for the legendary view", next: 1 }, { label: "What is this summit?", next: 1 }] },
      { text: "This summit hides a secret… There is one spot where you can see Lakes Thun AND Brienz at the same time. Think you can find it?", choices: [{ label: "🔥 I accept the challenge!", next: 2 }, { label: "Is it hard?", next: 2 }] },
      { text: "The funicular takes you there directly. Look for the bench facing north. At sunrise, both lakes shine like mirrors… Are you ready?", choices: [{ label: "🗺 Mark as discovered!", next: 'done' }, { label: "Give me another hint", next: 3 }] },
      { text: "Look between the two trees at the edge of the viewpoint. There, the view opens to both lakes at once. Few people know this… now you do.", choices: [{ label: "✨ Amazing! Discover", next: 'done' }] },
    ],
  },
  'quest-hoehematte': {
    emoji: '🧑‍🌾', name: 'Bruno', title: 'Guardian of the Höhematte', color: '#16A34A',
    steps: [
      { text: "Hello! I'm Bruno, I've been watching over this park for years. Did you know hundreds of paragliders land here every summer?", choices: [{ label: "Really? Where exactly?", next: 1 }, { label: "This park is huge!", next: 1 }] },
      { text: "Right in the town center, paragliders descend from the mountains and land here between the hotels. It's unique in the world! Want to know more?", choices: [{ label: "Yes, tell me more!", next: 2 }, { label: "I've already seen it!", next: 2 }] },
      { text: "The landing zone is marked on the ground. Look for the white cross in the grass — that's where adventurers touch down after 20 minutes in the air.", choices: [{ label: "🗺 Found it! Discover", next: 'done' }, { label: "Which side of the park?", next: 3 }] },
      { text: "East side of the park, facing the Alps. Between the Hotel Metropole and the main street. The white cross is visible from the sidewalk.", choices: [{ label: "🎯 Discover this quest!", next: 'done' }] },
    ],
  },
  'quest-lauterbrunnen': {
    emoji: '🧙', name: 'Aqua', title: 'Spirit of the Waterfalls', color: '#0EA5E9',
    steps: [
      { text: "...Who dares disturb the silence of my waterfalls?! I am Aqua, and these 72 waterfalls are my daughters. Have you come to admire them?", choices: [{ label: "72 waterfalls?! Really?", next: 1 }, { label: "I've come to challenge you!", next: 1 }] },
      { text: "The largest, the Staubbachfall, drops 297 metres in free fall. The water turns to mist before hitting the ground… Have you ever seen anything so beautiful?", choices: [{ label: "Never! How do I get there?", next: 2 }, { label: "How is that possible?", next: 2 }] },
      { text: "From the valley, look up at the vertical cliff face. The waterfall seems to emerge from the sky itself. In the mornings, the sun turns it into a rainbow…", choices: [{ label: "🌈 Discover this wonder!", next: 'done' }, { label: "Are there more waterfalls?", next: 3 }] },
      { text: "The Trümmelbachfälle is inside the mountain — 10 glacial waterfalls within the rock. Unique in Europe. You have to go.", choices: [{ label: "💦 Discover Lauterbrunnen!", next: 'done' }] },
    ],
  },
  'quest-brienz': {
    emoji: '🧑‍✈️', name: 'Hans', title: 'Captain of Lake Brienz', color: '#0D9488',
    steps: [
      { text: "Hm. A tourist. I'm Hans, captain on this lake for 40 years. The turquoise water surprises you, eh? It comes from the glaciers.", choices: [{ label: "It's really turquoise?", next: 1 }, { label: "The glaciers? Which ones?", next: 1 }] },
      { text: "The meltwater from the Oberaar glacier flows down here. The glacial flour in suspension gives it this unique blue-green color. Impossible to replicate.", choices: [{ label: "That's fascinating!", next: 2 }, { label: "What about Lake Thun?", next: 2 }] },
      { text: "Lake Thun is to the west, Brienz to the east. Interlaken is BETWEEN the two — that's why it's called 'inter-laken'. Look for the steamboat pier…", choices: [{ label: "⛵ Discover Lake Brienz!", next: 'done' }, { label: "Are there steamboats?", next: 3 }] },
      { text: "Since 1839, steamboats have sailed these waters. The BLS Lötschberg leaves the dock every morning at 9am. I've steered it 3,000 times.", choices: [{ label: "🚢 Discover this quest!", next: 'done' }] },
    ],
  },
  'quest-jungfraujoch': {
    emoji: '🦅', name: 'Blanche', title: 'Eagle of the Summit', color: '#7C3AED',
    steps: [
      { text: "KRIEEE! I am Blanche, I watched this mountain come into being. At 3,454 metres, I reign over the Top of Europe. Dare you climb up to me?", choices: [{ label: "🏔 I want to go up!", next: 1 }, { label: "What is the Jungfraujoch?", next: 1 }] },
      { text: "The highest railway station in Europe. A tunnel carved through the Eiger in 1912. The Aletsch Glacier stretches 23 km from here. This is my home.", choices: [{ label: "How do I get there?", next: 2 }, { label: "Is it cold up there?", next: 2 }] },
      { text: "From Interlaken Ost, the cog railway climbs in 2 hours. At -2°C in summer, with 11 metres of snow in winter. The Sphinx Observatory almost touches the clouds…", choices: [{ label: "🦅 Discover the summit!", next: 'done' }, { label: "What can you see up there?", next: 3 }] },
      { text: "The Aletsch Glacier, the longest in Europe. The peaks of the Eiger, Mönch and Jungfrau. On a clear day, you can see all the way to France. This has always been my territory.", choices: [{ label: "✨ Discover the Top of Europe!", next: 'done' }] },
    ],
  },
  'quest-schynige-platte': {
    emoji: '🌸', name: 'Flora', title: 'Alpine Botanist', color: '#DB2777',
    steps: [
      { text: "Oh hello! I'm Flora, a botanist here for 30 years. At 1,967 metres, this garden is home to 600 species of alpine plants. Do you like flowers?", choices: [{ label: "I love nature!", next: 1 }, { label: "600 species?!", next: 1 }] },
      { text: "The edelweiss, blue gentian, rhododendrons… Plants that grow nowhere else. Some bloom for only 2 weeks a year!", choices: [{ label: "Amazing! Where can I see them?", next: 2 }, { label: "When do they bloom?", next: 2 }] },
      { text: "This is the oldest high-altitude botanical garden in Switzerland. Look for the wooden bench facing the panorama — that's where I work every morning.", choices: [{ label: "🌸 Discover the garden!", next: 'done' }, { label: "How to get there?", next: 3 }] },
      { text: "The rack railway from Wilderswil, built in 1893. It climbs through flowering meadows. In June-July, the journey itself is magnificent.", choices: [{ label: "🚞 Discover this quest!", next: 'done' }] },
    ],
  },
};

// ─── hidden tourist spot characters ──────────────────────────────────────────
const SPOT_CHARACTERS: Record<string, CharData> = {
  'spot-grindelwald': {
    emoji: '🧗', name: 'Felix', title: 'Climber of the Eiger', color: '#B45309',
    steps: [
      { text: "Hey there! I'm Felix, and I've been climbing in this valley for 20 years. See that dark wall towering above? That's the Eiger Nordwand — the most feared north face in the Alps. Nearly 1,800 m of sheer vertical rock.", choices: [{ label: "Has anyone climbed it?", next: 1 }, { label: "It looks terrifying!", next: 1 }] },
      { text: "The first successful ascent wasn't until 1938 — after years of failed attempts and many deaths. Today the best alpinists come from all over the world to test themselves here. Grindelwald village sits right at its foot.", choices: [{ label: "What's special about the village?", next: 2 }, { label: "I want to try!", next: 2 }] },
      { text: "Grindelwald is the gateway to the Eiger, Mönch and Jungfrau. Every morning you wake up with these three giants filling your window. The air here smells of pine and altitude. You've found the beating heart of Swiss mountaineering! 🏔", choices: [{ label: "🧗 Discover Grindelwald!", next: 'done' }] },
    ],
  },
  'spot-thun-castle': {
    emoji: '🏰', name: 'Lady Thun', title: 'Duchess of Thun Castle', color: '#7C3AED',
    steps: [
      { text: "Who approaches my castle?! I am Lady Thun, and I have kept watch over this lake from these towers since the 12th century. Few travellers know our secret…", choices: [{ label: "What secret?", next: 1 }, { label: "Your castle is beautiful!", next: 1 }] },
      { text: "Thun Castle is one of the most perfectly preserved medieval fortresses in Switzerland. Four towers, four floors of history, armour, tapestries — and from the battlements, a view over the whole lake and the Alps beyond.", choices: [{ label: "What's the town below like?", next: 2 }, { label: "How old is it exactly?", next: 2 }] },
      { text: "The old town of Thun has arcaded shopping streets where the footpaths run on top of the shop rooftops — unique in all of Switzerland. Every cobblestone carries 800 years of history. Welcome to my kingdom! 👑", choices: [{ label: "🏰 Discover Thun Castle!", next: 'done' }] },
    ],
  },
  'spot-brienz-wood': {
    emoji: '🪵', name: 'Gottfried', title: 'Master Wood Carver of Brienz', color: '#92400E',
    steps: [
      { text: "Grüezi! I'm Gottfried. In Brienz, we've been carving wood for over 200 years. Every family has the tradition. See this bear? Carved from local linden wood by my own hands.", choices: [{ label: "Why bears?", next: 1 }, { label: "That's incredible craftsmanship!", next: 1 }] },
      { text: "The bear became the symbol of Switzerland. The famous Swiss wood-carved bears sold across the world — they all come from Brienz or this valley. We also build fine violins here, did you know?", choices: [{ label: "What's the lake like here?", next: 2 }, { label: "I want to see the workshop!", next: 2 }] },
      { text: "Lake Brienz is the most intensely turquoise lake in Switzerland — glacial flour from the mountains makes it shimmer like a jewel. Brienz is the village that sculpts with both wood and light. Welcome! 🎨", choices: [{ label: "🪵 Discover Brienz!", next: 'done' }] },
    ],
  },
  'spot-sigriswil': {
    emoji: '🌁', name: 'Vera', title: 'Guardian of the Bridge', color: '#0369A1',
    steps: [
      { text: "Careful! I'm Vera, guardian of this bridge. Don't look down straight away… unless you're brave enough! We're 182 metres above the Gürbe valley floor. The bridge sways gently in the wind.", choices: [{ label: "How long is the bridge?", next: 1 }, { label: "I'm not afraid!", next: 1 }] },
      { text: "340 metres long — the longest pedestrian suspension bridge in the Bernese Oberland. On a clear day from the centre, you can see Lake Thun glittering to the west and the Eiger to the east.", choices: [{ label: "Is it popular with locals?", next: 2 }, { label: "The view is breathtaking!", next: 2 }] },
      { text: "Most tourists drive straight past on their way to Interlaken and never find it. That's why it stays peaceful. You've discovered one of the Bernese Oberland's best-kept secrets — and earned it! 🌉", choices: [{ label: "🌁 Discover Sigriswil Bridge!", next: 'done' }] },
    ],
  },
  'spot-ballenberg': {
    emoji: '🏛', name: 'Margrit', title: 'Keeper of Swiss Heritage', color: '#065F46',
    steps: [
      { text: "Welcome! I'm Margrit. You've found Ballenberg — the Swiss Open Air Museum. We have over 100 authentic historical buildings from every Swiss canton, moved here stone by stone and timber by timber since 1978.", choices: [{ label: "What kind of buildings?", next: 1 }, { label: "Moved stone by stone?!", next: 1 }] },
      { text: "Farmhouses, mills, cheese dairies, craftsmen's workshops — all from the years 1600 to 1900. We have live animals, costumed craftspeople, and you can taste freshly made cheese. It's Switzerland alive.", choices: [{ label: "How big is it?", next: 2 }, { label: "Where is it exactly?", next: 2 }] },
      { text: "Nearly 66 hectares of living history, right on the shores of Lake Brienz. This is the soul of Switzerland, preserved for future generations. Few visitors know it exists. Now you do. 🇨🇭", choices: [{ label: "🏛 Discover Ballenberg!", next: 'done' }] },
    ],
  },
};

// ─── combined characters lookup ───────────────────────────────────────────────
const ALL_CHARACTERS: Record<string, CharData> = { ...CHARACTERS, ...SPOT_CHARACTERS };

const QUEST_TO_ACTIVITY: Record<string, string> = {
  'quest-harder-kulm':     'activity-harder-kulm',
  'quest-hoehematte':      'activity-paragliding',
  'quest-lauterbrunnen':   'activity-lauterbrunnen',
  'quest-brienz':          'activity-boat-brienz',
  'quest-jungfraujoch':    'activity-jungfraujoch',
  'quest-schynige-platte': 'activity-schynige-platte',
};

const QUEST_LOCATIONS: QuestLocation[] = [
  { id: 'quest-harder-kulm',     name: 'Harder Kulm',          lat: 46.6961, lon: 7.8580, reward: 40 },
  { id: 'quest-hoehematte',      name: 'Höhematte Park',        lat: 46.6863, lon: 7.8632, reward: 25 },
  { id: 'quest-lauterbrunnen',   name: 'Staubbach Waterfall',   lat: 46.5935, lon: 7.9088, reward: 50 },
  { id: 'quest-brienz',          name: 'Lake Brienz',           lat: 46.7150, lon: 7.9400, reward: 35 },
  { id: 'quest-jungfraujoch',    name: 'Top of Europe',         lat: 46.5474, lon: 7.9854, reward: 60 },
  { id: 'quest-schynige-platte', name: 'Alpine Garden',         lat: 46.6614, lon: 7.9039, reward: 45 },
  // hidden tourist spots — reward tokens + points
  { id: 'spot-grindelwald',  name: '??? Hidden Spot', lat: 46.6247, lon: 8.0413, reward: 20, rewardTokens: 30, isSpot: true },
  { id: 'spot-thun-castle',  name: '??? Hidden Spot', lat: 46.7575, lon: 7.6282, reward: 15, rewardTokens: 25, isSpot: true },
  { id: 'spot-brienz-wood',  name: '??? Hidden Spot', lat: 46.7491, lon: 7.9985, reward: 20, rewardTokens: 30, isSpot: true },
  { id: 'spot-sigriswil',    name: '??? Hidden Spot', lat: 46.7085, lon: 7.7450, reward: 25, rewardTokens: 35, isSpot: true },
  { id: 'spot-ballenberg',   name: '??? Hidden Spot', lat: 46.7480, lon: 8.0380, reward: 10, rewardTokens: 20, isSpot: true },
];

const REGULAR_QUESTS = QUEST_LOCATIONS.filter(q => !q.isSpot);
const TOURIST_SPOTS  = QUEST_LOCATIONS.filter(q => q.isSpot);

// ─── quest character marker (bobbing) ─────────────────────────────────────────
function QuestCharMarker({ questId, done }: { questId: string; done: boolean }) {
  const char = ALL_CHARACTERS[questId];
  const bob  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -6, duration: 700, useNativeDriver: true }),
        Animated.timing(bob, { toValue:  0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bg = done ? '#14532D' : (char?.color ?? '#7C3AED');

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bob }] }}>
      <View style={[styles.charBubble, { backgroundColor: bg }]}>
        <Text style={styles.charEmoji}>{done ? '✓' : (char?.emoji ?? '?')}</Text>
      </View>
      <View style={[styles.charTail, { borderTopColor: bg }]} />
    </Animated.View>
  );
}

// ─── hidden spot marker (pulsing gold) ───────────────────────────────────────
function SpotMarker({ spotId, done }: { spotId: string; done: boolean }) {
  const char  = SPOT_CHARACTERS[spotId];
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (done) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [done]);

  const bg = done ? '#14532D' : '#D97706';

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ scale: pulse }] }}>
      <View style={[styles.spotBubble, { backgroundColor: bg }]}>
        <Text style={styles.charEmoji}>{done ? '✓' : (char?.emoji ?? '🏛')}</Text>
      </View>
      <View style={[styles.charTail, { borderTopColor: bg }]} />
    </Animated.View>
  );
}

// ─── icons ────────────────────────────────────────────────────────────────────
const TrophyIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M8 21h8M12 17v4M7 4H5a2 2 0 00-2 2v1a5 5 0 005 5h.5M17 4h2a2 2 0 012 2v1a5 5 0 01-5 5h-.5" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 4h10v6a5 5 0 01-10 0V4z" stroke="#111827" strokeWidth="2" strokeLinejoin="round" />
  </Svg>
);

const CameraIconSvg = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#111827" strokeWidth="2" />
    <Circle cx="12" cy="13" r="4" stroke="#111827" strokeWidth="2" />
  </Svg>
);

// ─── tx helpers ───────────────────────────────────────────────────────────────
interface Tx { id: string; partnerName: string; amount: number; type: string; timestamp: string }
function txColor(type: string) { return type === 'payment' ? '#EF4444' : type === 'benefit_redemption' ? '#7C3AED' : '#16A34A'; }
function txIcon(type: string)  { return type === 'payment' ? '↑' : type === 'benefit_redemption' ? '★' : '↓'; }
function txLabel(tx: Tx) {
  if (tx.type === 'payment')           return `-${tx.amount} 🪙 · ${tx.partnerName}`;
  if (tx.type === 'benefit_redemption') return `Benefit · ${tx.partnerName}`;
  return `+${tx.amount} 🪙 · ${tx.partnerName}`;
}
function fmtTs(ts: string) {
  try { return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ts; }
}

type FilterType = 'all' | 'partners' | 'activities' | 'quests' | 'spots';
const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all',        label: '🗺 All' },
  { id: 'partners',   label: '🏪 Partners' },
  { id: 'activities', label: '🎯 Activities' },
  { id: 'quests',     label: '🧝 Quests' },
  { id: 'spots',      label: '🏛 Hidden Spots' },
];

// ─── screen ───────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const [userId,               setUserId]               = useState<string | null>(null);
  const [userLocation,         setUserLocation]         = useState<{ latitude: number; longitude: number } | null>(null);
  const [registeredActivities, setRegisteredActivities] = useState<Set<string>>(new Set());
  const [discoveredQuests,     setDiscoveredQuests]     = useState<Set<string>>(new Set());
  const [transactions,         setTransactions]         = useState<Tx[]>([]);
  const [profilePhoto,         setProfilePhoto]         = useState<string | null>(null);
  const [activeFilter,         setActiveFilter]         = useState<FilterType>('all');

  const [convQuest, setConvQuest] = useState<QuestLocation | null>(null);
  const [convStep,  setConvStep]  = useState(0);

  const { wallet, refresh } = useWallet(userId);
  const weather = useWeather();
  const mapRef      = useRef<MapView>(null);
  const mapReady    = useRef(false);
  const pendingCenter = useRef<{ latitude: number; longitude: number } | null>(null);

  const sheetY = useRef(new Animated.Value(SHEET_COLLAPSED_OFFSET)).current;
  const lastY  = useRef(SHEET_COLLAPSED_OFFSET);

  const snapSheet = (toExpanded: boolean) => {
    const toValue = toExpanded ? SHEET_EXPANDED_OFFSET : SHEET_COLLAPSED_OFFSET;
    lastY.current = toValue;
    Animated.spring(sheetY, { toValue, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove:  (_, g) => {
        const next = Math.max(SHEET_EXPANDED_OFFSET, Math.min(SHEET_COLLAPSED_OFFSET, lastY.current + g.dy));
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40) snapSheet(true);
        else if (g.dy > 40) snapSheet(false);
        else snapSheet(lastY.current < SHEET_COLLAPSED_OFFSET / 2);
      },
    })
  ).current;

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('userId').then(id => { setUserId(id); if (id) refresh(); });
    AsyncStorage.getItem('registered_activities').then(raw => { if (raw) setRegisteredActivities(new Set(JSON.parse(raw))); });
    AsyncStorage.getItem('discovered_quests').then(raw => { if (raw) setDiscoveredQuests(new Set(JSON.parse(raw))); });
    AsyncStorage.getItem('transactions').then(raw => { if (raw) setTransactions(JSON.parse(raw)); });
    AsyncStorage.getItem('profile_photo').then(photo => setProfilePhoto(photo));
  }, [refresh]));

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      if (mapReady.current) {
        mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.025, longitudeDelta: 0.058 }, 800);
      } else {
        pendingCenter.current = coords;
      }
    })();
  }, []);

  const centerOnUser = () => {
    const target = userLocation ?? { latitude: INTERLAKEN.latitude, longitude: INTERLAKEN.longitude };
    mapRef.current?.animateToRegion({ ...target, latitudeDelta: 0.025, longitudeDelta: 0.058 }, 600);
  };

  const handleCharacterPress = (quest: QuestLocation) => {
    if (discoveredQuests.has(quest.id)) return;
    setConvQuest(quest);
    setConvStep(0);
  };

  const handleChoice = async (next: number | 'done') => {
    if (next === 'done') {
      if (!convQuest) return;

      const nextDiscovered = new Set([...discoveredQuests, convQuest.id]);
      setDiscoveredQuests(nextDiscovered);
      await AsyncStorage.setItem('discovered_quests', JSON.stringify([...nextDiscovered]));

      const actId = QUEST_TO_ACTIVITY[convQuest.id];
      if (actId) {
        const rawAct = await AsyncStorage.getItem('registered_activities');
        const nextActs = new Set<string>(rawAct ? JSON.parse(rawAct) : []);
        nextActs.add(actId);
        setRegisteredActivities(nextActs);
        await AsyncStorage.setItem('registered_activities', JSON.stringify([...nextActs]));
      }

      const raw = await AsyncStorage.getItem('wallet_data');
      if (raw) {
        const w = JSON.parse(raw);
        w.pointsBalance  = (w.pointsBalance  ?? 0) + convQuest.reward;
        if (convQuest.rewardTokens) {
          w.tokenBalance = (w.tokenBalance ?? 0) + convQuest.rewardTokens;
        }
        await AsyncStorage.setItem('wallet_data', JSON.stringify(w));
      }
      await saveUserSnapshot();
      setConvQuest(null);
    } else {
      setConvStep(next);
    }
  };

  const name    = wallet?.name ?? 'Guest';
  const balance = wallet?.tokenBalance ?? 0;
  const initial = name.charAt(0).toUpperCase();
  const stay    = wallet?.checkIn && wallet?.checkOut ? stayStatus(wallet.checkIn, wallet.checkOut) : null;

  const char    = convQuest ? ALL_CHARACTERS[convQuest.id] : null;
  const curStep = char ? char.steps[convStep] : null;

  const questDiscovered   = REGULAR_QUESTS.filter(q => discoveredQuests.has(q.id)).length;
  const spotDiscovered    = TOURIST_SPOTS.filter(q => discoveredQuests.has(q.id)).length;

  const showPartners   = activeFilter === 'all' || activeFilter === 'partners';
  const showActivities = activeFilter === 'all' || activeFilter === 'activities';
  const showQuests     = activeFilter === 'all' || activeFilter === 'quests';
  const showSpots      = activeFilter === 'all' || activeFilter === 'spots';

  return (
    <View style={styles.container}>

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={INTERLAKEN}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsBuildings
        onMapReady={() => {
          mapReady.current = true;
          if (pendingCenter.current) {
            mapRef.current?.animateToRegion({ ...pendingCenter.current, latitudeDelta: 0.025, longitudeDelta: 0.058 }, 800);
            pendingCenter.current = null;
          }
        }}
      >
        {showPartners && PARTNER_MARKERS.map(p => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lon }} title={p.name}>
            <View>
              <View style={[styles.markerBubble, { backgroundColor: p.color }]}>
                <Text style={styles.markerEmoji}>{p.emoji}</Text>
              </View>
              <View style={[styles.markerTail, { borderTopColor: p.color }]} />
            </View>
          </Marker>
        ))}

        {showActivities && ACTIVITY_MARKERS.map(a => {
          const booked = registeredActivities.has(a.id);
          return (
            <Marker key={a.id} coordinate={{ latitude: a.lat, longitude: a.lon }} title={a.name}
              onPress={() => router.push(`/(guest)/activities?openId=${a.id}` as any)}>
              <View style={[styles.actMarker, booked && styles.actMarkerBooked]}>
                {booked ? <Text style={styles.actMarkerCheck}>✓</Text> : <Text style={{ fontSize: 16 }}>{a.emoji}</Text>}
              </View>
              {booked && <View style={styles.actTail} />}
            </Marker>
          );
        })}

        {showQuests && REGULAR_QUESTS.map(q => {
          const done = discoveredQuests.has(q.id);
          return (
            <Marker
              key={q.id}
              coordinate={{ latitude: q.lat, longitude: q.lon }}
              title={done ? q.name : `??? · Talk to ${ALL_CHARACTERS[q.id]?.name ?? '?'}`}
              onPress={() => handleCharacterPress(q)}
              tracksViewChanges={false}
            >
              <QuestCharMarker questId={q.id} done={done} />
            </Marker>
          );
        })}

        {showSpots && TOURIST_SPOTS.map(q => {
          const done = discoveredQuests.has(q.id);
          return (
            <Marker
              key={q.id}
              coordinate={{ latitude: q.lat, longitude: q.lon }}
              title={done ? (ALL_CHARACTERS[q.id]?.name ?? q.id) : '🏛 Hidden Spot — tap to discover!'}
              onPress={() => handleCharacterPress(q)}
              tracksViewChanges={false}
            >
              <SpotMarker spotId={q.id} done={done} />
            </Marker>
          );
        })}
      </MapView>

      {/* ── Header ── */}
      <View style={styles.topOverlay}>
        <View style={styles.headerCard}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.avatarCircle} onPress={() => router.push('/(guest)/profile' as any)} activeOpacity={0.8}>
              {profilePhoto
                ? <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
                : <Text style={styles.avatarInitial}>{initial}</Text>
              }
            </TouchableOpacity>
            <View>
              <Text style={styles.headerName}>Hi, {name}</Text>
              {weather && <Text style={styles.headerWeather}>{weather.emoji} {weather.temp}°C · Interlaken</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.questBadge}>
              <Text style={styles.questBadgeText}>⭐ {questDiscovered}/{REGULAR_QUESTS.length}</Text>
            </View>
            <View style={styles.questBadge}>
              <Text style={[styles.questBadgeText, { color: '#D97706' }]}>🏛 {spotDiscovered}/{TOURIST_SPOTS.length}</Text>
            </View>
            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(guest)/challenges' as any)} activeOpacity={0.8}><TrophyIcon /></TouchableOpacity>
            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(guest)/competition' as any)} activeOpacity={0.8}><CameraIconSvg /></TouchableOpacity>
          </View>
        </View>

        {/* filter bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterPill, activeFilter === f.id && styles.filterPillActive]}
              onPress={() => setActiveFilter(f.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, activeFilter === f.id && styles.filterPillTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Legend ── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#14532D' }]} /><Text style={styles.legendText}>Activity</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#84CC16' }]} /><Text style={styles.legendText}>Booked</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#7C3AED' }]} /><Text style={styles.legendText}>Quest</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#D97706' }]} /><Text style={styles.legendText}>Hidden</Text></View>
      </View>

      {/* ── Locate ── */}
      <TouchableOpacity style={styles.locBtn} onPress={centerOnUser} activeOpacity={0.85}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="4" stroke="#14532D" strokeWidth="2" />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#14532D" strokeWidth="2" strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>

      {/* ── Bottom sheet ── */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
        <View {...panResponder.panHandlers} style={styles.sheetHandle}>
          <View style={styles.handleBar} />
          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
              <View style={styles.balanceAmt}>
                <Text style={styles.balanceNum}>{balance}</Text>
                <Text style={styles.balanceCoin}>🪙 tokens</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.payBtn, stay && !stay.active && styles.payBtnDisabled]}
              onPress={() => router.push('/(guest)/scan' as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.payBtnText}>Pay / Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.txList} contentContainerStyle={styles.txListContent} showsVerticalScrollIndicator={false}>
          {transactions.length === 0 ? (
            <Text style={styles.txEmpty}>No transactions yet</Text>
          ) : (
            transactions.slice(0, 30).map((tx, i) => (
              <View key={tx.id ?? i} style={styles.txRow}>
                <View style={[styles.txIconBox, { backgroundColor: txColor(tx.type) + '18' }]}>
                  <Text style={[styles.txIconText, { color: txColor(tx.type) }]}>{txIcon(tx.type)}</Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>{txLabel(tx)}</Text>
                  <Text style={styles.txTime}>{fmtTs(tx.timestamp)}</Text>
                </View>
                {tx.type === 'payment' && <Text style={[styles.txAmt, { color: '#EF4444' }]}>-{tx.amount}</Text>}
                {tx.type !== 'payment' && tx.amount > 0 && <Text style={[styles.txAmt, { color: '#16A34A' }]}>+{tx.amount}</Text>}
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>

      {/* ── Conversation modal ── */}
      <Modal visible={!!convQuest && !!char} transparent animationType="slide" onRequestClose={() => setConvQuest(null)}>
        <View style={styles.convOverlay}>
          <TouchableOpacity style={styles.convBg} activeOpacity={1} onPress={() => setConvQuest(null)} />
          <View style={styles.convSheet}>
            <View style={styles.convHeader}>
              <View style={[styles.convAvatar, { backgroundColor: char?.color ?? '#7C3AED' }]}>
                <Text style={styles.convAvatarEmoji}>{char?.emoji}</Text>
              </View>
              <View style={styles.convCharInfo}>
                <Text style={styles.convCharName}>{char?.name}</Text>
                <Text style={styles.convCharTitle}>{char?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setConvQuest(null)} style={styles.convClose}>
                <Text style={styles.convCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {convQuest && (
              <View style={styles.convRewardRow}>
                <View style={[styles.convRewardBadge, { backgroundColor: (char?.color ?? '#7C3AED') + '18' }]}>
                  <Text style={[styles.convRewardText, { color: char?.color ?? '#7C3AED' }]}>
                    +{convQuest.reward} pts{convQuest.rewardTokens ? ` · +${convQuest.rewardTokens} 🪙 tokens` : ''} to earn
                  </Text>
                </View>
              </View>
            )}

            {curStep && (
              <View style={[styles.speechBubble, { borderLeftColor: char?.color ?? '#7C3AED' }]}>
                <Text style={styles.speechText}>{curStep.text}</Text>
              </View>
            )}

            <View style={styles.choicesContainer}>
              {curStep?.choices.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.choiceBtn, { borderColor: char?.color ?? '#7C3AED' }]}
                  onPress={() => handleChoice(c.next)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.choiceBtnText, { color: char?.color ?? '#7C3AED' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  markerBubble: {
    width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  markerEmoji: { fontSize: 18 },
  markerTail:  {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  actMarker:       { backgroundColor: '#FFFFFF', borderRadius: 999, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D1D5DB', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  actMarkerBooked: { backgroundColor: '#14532D', borderColor: '#84CC16' },
  actMarkerCheck:  { fontSize: 15, fontWeight: '900', color: '#84CC16' },
  actTail:         { width: 0, height: 0, alignSelf: 'center', borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#14532D' },

  charBubble: { width: 42, height: 42, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  charEmoji:  { fontSize: 22 },
  charTail:   { width: 0, height: 0, alignSelf: 'center', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent' },

  spotBubble: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#FEF3C7', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },

  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 56, paddingHorizontal: 16, paddingBottom: 4 },
  headerCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarCircle:  { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitial: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  avatarImg:     { width: 38, height: 38, borderRadius: 19 },
  headerName:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  headerWeather: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  questBadge:    { backgroundColor: '#F3F0FF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  questBadgeText:{ fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  bellBtn:       { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  filterBar:        { marginTop: 8 },
  filterBarContent: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  filterPill:       { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  filterPillActive: { backgroundColor: '#14532D', borderColor: '#14532D' },
  filterPillText:   { fontSize: 12, fontWeight: '600', color: '#374151' },
  filterPillTextActive: { color: '#FFFFFF' },

  legend: {
    position: 'absolute', top: 240, right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#374151', fontWeight: '500' },

  locBtn: {
    position: 'absolute', right: 16, bottom: 200,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },

  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 64,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 14,
    height: SHEET_HEIGHT,
  },
  sheetHandle:    { paddingHorizontal: 20, paddingBottom: 14, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  handleBar:      { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 12 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel:   { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5 },
  balanceAmt:     { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  balanceNum:     { fontSize: 30, fontWeight: '800', color: '#111827', letterSpacing: -1 },
  balanceCoin:    { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  payBtn:         { backgroundColor: '#14532D', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  payBtnDisabled: { backgroundColor: '#9CA3AF' },
  payBtnText:     { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  stayPill:             { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, marginTop: 10, alignItems: 'center' },
  stayPillActive:       { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  stayPillInactive:     { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  stayPillText:         { fontSize: 12, fontWeight: '700' },
  stayPillTextActive:   { color: '#16A34A' },
  stayPillTextInactive: { color: '#DC2626' },

  txList:        { flex: 1 },
  txListContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 4 },
  txEmpty:       { textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 20 },
  txRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  txIconBox:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txIconText:{ fontSize: 16, fontWeight: '800' },
  txInfo:   { flex: 1 },
  txLabel:  { fontSize: 13, fontWeight: '600', color: '#111827' },
  txTime:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmt:    { fontSize: 14, fontWeight: '800' },

  convOverlay: { flex: 1, justifyContent: 'flex-end' },
  convBg:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  convSheet:   { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: -8 }, elevation: 20 },
  convHeader:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  convAvatar:      { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  convAvatarEmoji: { fontSize: 28 },
  convCharInfo:    { flex: 1 },
  convCharName:    { fontSize: 18, fontWeight: '800', color: '#111827' },
  convCharTitle:   { fontSize: 12, color: '#6B7280', marginTop: 1 },
  convClose:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  convCloseText:   { fontSize: 13, color: '#6B7280', fontWeight: '700' },
  convRewardRow:   { marginBottom: 14 },
  convRewardBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  convRewardText:  { fontSize: 12, fontWeight: '700' },
  speechBubble:    { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 20, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  speechText:      { fontSize: 15, color: '#111827', lineHeight: 23 },
  choicesContainer:{ gap: 10 },
  choiceBtn:       { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  choiceBtnText:   { fontSize: 14, fontWeight: '700' },
});
