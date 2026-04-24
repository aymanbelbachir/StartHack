import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

export default function PartnerLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => '📊', headerTitle: 'Partner Dashboard' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: () => '💳', headerTitle: 'Live Feed' }} />
      <Tabs.Screen name="confirm" options={{ title: 'Confirm', tabBarIcon: () => '✅', headerTitle: 'Confirm Redemption' }} />
    </Tabs>
  );
}
