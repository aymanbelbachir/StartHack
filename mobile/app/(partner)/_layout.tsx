import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IC = { color: string; size?: number };

const GridIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2" />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2" />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2" />
    <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2" />
  </Svg>
);

const ActivityIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckCircleIcon = ({ color, size = 22 }: IC) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TabIcon = ({ Icon, focused }: { Icon: React.FC<IC>; focused: boolean }) => (
  <View style={focused ? { backgroundColor: '#84CC16', borderRadius: 999, padding: 8 } : { padding: 8 }}>
    <Icon color={focused ? '#111827' : '#9CA3AF'} size={20} />
  </View>
);

export default function PartnerLayout() {
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
        options={{ headerTitle: 'Partner Dashboard', tabBarIcon: ({ focused }) => <TabIcon Icon={GridIcon} focused={focused} /> }}
      />
      <Tabs.Screen
        name="transactions"
        options={{ headerTitle: 'Live Feed', tabBarIcon: ({ focused }) => <TabIcon Icon={ActivityIcon} focused={focused} /> }}
      />
      <Tabs.Screen
        name="confirm"
        options={{ headerTitle: 'Confirm Redemption', tabBarIcon: ({ focused }) => <TabIcon Icon={CheckCircleIcon} focused={focused} /> }}
      />
    </Tabs>
  );
}
