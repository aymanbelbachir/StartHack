import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IC = { color: string; size?: number };

const HomeIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H14v-6h-4v6H4a1 1 0 01-1-1V10.5z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </Svg>
);

const CardIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M2 10h20" stroke={color} strokeWidth="2" />
  </Svg>
);

const GiftIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="8" width="18" height="13" rx="1" stroke={color} strokeWidth="2" />
    <Path d="M12 8v13" stroke={color} strokeWidth="2" />
    <Path d="M3 13h18" stroke={color} strokeWidth="2" />
    <Path d="M8 8c0-2.5 4-5 4 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M16 8c0-2.5-4-5-4 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const CompassIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const TabIcon = ({ Icon, focused }: { Icon: React.FC<IC>; focused: boolean }) => (
  <View style={focused ? { backgroundColor: '#84CC16', borderRadius: 999, padding: 8 } : { padding: 8 }}>
    <Icon color={focused ? '#111827' : '#9CA3AF'} size={20} />
  </View>
);

export default function GuestLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 28,
          left: 20,
          right: 20,
          borderRadius: 999,
          backgroundColor: '#111827',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 16,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        },
        headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
        headerTintColor: '#111827',
        tabBarActiveTintColor: '#84CC16',
        tabBarInactiveTintColor: '#9CA3AF',
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
    </Tabs>
  );
}
