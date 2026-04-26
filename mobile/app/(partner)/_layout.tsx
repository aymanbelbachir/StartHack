import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IC = { color: string; size?: number };

const GridIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.6" />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.6" />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.6" />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.6" />
  </Svg>
);

const ActivityIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckCircleIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.6" />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PersonIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.6" />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
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
  item: { alignItems: 'center', justifyContent: 'center', paddingTop: 0 },
  activeDot: {
    position: 'absolute', top: -4,
    width: 20, height: 2, borderRadius: 999, backgroundColor: '#84CC16',
  },
});

function GlassBackground() {
  return (
    <BlurView intensity={Platform.OS === 'ios' ? 60 : 80} tint="dark" style={StyleSheet.absoluteFill}>
      <View style={glassStyles.overlay} />
    </BlurView>
  );
}

const glassStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(17,24,39,0.6)' : 'rgba(17,24,39,0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(132,204,22,0.18)',
    borderTopColor: 'rgba(132,204,22,0.28)',
  },
});

export default function PartnerLayout() {
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
          shadowColor: '#0D2818',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 20,
        },
        headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
        headerTintColor: '#111827',
        tabBarActiveTintColor: '#84CC16',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center', paddingBottom: 0, paddingTop: 0 },
      }}
    >
      <Tabs.Screen name="index"        options={{ headerTitle: 'Partner Dashboard', tabBarIcon: ({ focused }) => <TabIcon Icon={GridIcon}        focused={focused} /> }} />
      <Tabs.Screen name="transactions" options={{ headerTitle: 'Live Feed',          tabBarIcon: ({ focused }) => <TabIcon Icon={ActivityIcon}   focused={focused} /> }} />
      <Tabs.Screen name="confirm"      options={{ headerTitle: 'Confirm Redemption', tabBarIcon: ({ focused }) => <TabIcon Icon={CheckCircleIcon} focused={focused} /> }} />
      <Tabs.Screen name="bookings"     options={{ href: null }} />
      <Tabs.Screen name="voucher"      options={{ href: null }} />
      <Tabs.Screen name="account"      options={{ headerTitle: 'Account',            tabBarIcon: ({ focused }) => <TabIcon Icon={PersonIcon}     focused={focused} /> }} />
    </Tabs>
  );
}
