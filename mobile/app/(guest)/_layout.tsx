import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IC = { color: string; size?: number };

const HomeIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H14v-6h-4v6H4a1 1 0 01-1-1V10.5z"
      stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </Svg>
);

const CardIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="14" rx="3" stroke={color} strokeWidth="1.6" />
    <Path d="M2 10h20" stroke={color} strokeWidth="1.6" />
    <Path d="M6 15h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const GiftIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="8" width="18" height="13" rx="2" stroke={color} strokeWidth="1.6" />
    <Path d="M12 8v13" stroke={color} strokeWidth="1.6" />
    <Path d="M3 13h18" stroke={color} strokeWidth="1.6" />
    <Path d="M8.5 8C7 5.5 10 3 12 8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    <Path d="M15.5 8C17 5.5 14 3 12 8" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

const CompassIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.6" />
    <Path d="M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1z"
      stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.6" />
    <Path d="M12 7v5l3 2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

function TabIcon({ Icon, focused }: { Icon: React.FC<IC>; focused: boolean }) {
  return (
    <View style={tabStyles.item}>
      {focused && <View style={tabStyles.activeDot} />}
      <Icon color={focused ? '#84CC16' : 'rgba(255,255,255,0.45)'} size={24} />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
  },
  activeDot: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#84CC16',
  },
});

function GlassBackground() {
  return (
    <BlurView
      intensity={Platform.OS === 'ios' ? 60 : 80}
      tint="dark"
      style={StyleSheet.absoluteFill}
    >
      <View style={glassStyles.overlay} />
    </BlurView>
  );
}

const glassStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios'
      ? 'rgba(5, 28, 14, 0.55)'
      : 'rgba(5, 28, 14, 0.88)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(132, 204, 22, 0.18)',
    borderTopColor: 'rgba(132, 204, 22, 0.28)',
  },
});

export default function GuestLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarBackground: () => <GlassBackground />,
        tabBarStyle: {
          position: 'absolute',
          bottom: 12,
          left: 20,
          right: 20,
          borderRadius: 24,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 56,
          elevation: 0,
          shadowColor: '#052e16',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 20,
        },
        headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
        headerTintColor: '#111827',
        tabBarActiveTintColor: '#84CC16',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 0,
          paddingTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon Icon={HomeIcon} focused={focused} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon Icon={CardIcon} focused={focused} /> }}
      />
      <Tabs.Screen
        name="benefits"
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon Icon={GiftIcon} focused={focused} /> }}
      />
      <Tabs.Screen
        name="activities"
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon Icon={CompassIcon} focused={focused} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ headerShown: false, tabBarIcon: ({ focused }) => <TabIcon Icon={ClockIcon} focused={focused} /> }}
      />
      <Tabs.Screen name="profile"     options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="topup"       options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="challenges"  options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="competition" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
