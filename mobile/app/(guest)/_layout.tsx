import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

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
      <Tabs.Screen name="index" options={{ title: 'Wallet', tabBarIcon: () => '💳', headerTitle: 'My Wallet' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: () => '📷', headerTitle: 'Scan QR' }} />
      <Tabs.Screen name="benefits" options={{ title: 'Benefits', tabBarIcon: () => '🎁', headerTitle: 'My Benefits' }} />
      <Tabs.Screen name="activities" options={{ title: 'Discover', tabBarIcon: () => '🗺️', headerTitle: 'Discover' }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: () => '📋', headerTitle: 'Transactions' }} />
    </Tabs>
  );
}
