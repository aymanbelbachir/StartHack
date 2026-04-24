import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

const TabIcon = ({ emoji }: { emoji: string }) => (
  <Text style={{ fontSize: 22 }}>{emoji}</Text>
);

export default function GuestLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Wallet', tabBarIcon: () => <TabIcon emoji="💳" />, headerTitle: 'My Wallet' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: () => <TabIcon emoji="📷" />, headerTitle: 'Scan QR' }} />
      <Tabs.Screen name="benefits" options={{ title: 'Benefits', tabBarIcon: () => <TabIcon emoji="🎁" />, headerTitle: 'My Benefits' }} />
      <Tabs.Screen name="activities" options={{ title: 'Discover', tabBarIcon: () => <TabIcon emoji="🗺️" />, headerTitle: 'Discover' }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: () => <TabIcon emoji="📋" />, headerTitle: 'Transactions' }} />
    </Tabs>
  );
}
