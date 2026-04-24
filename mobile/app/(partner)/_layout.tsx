import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

const TabIcon = ({ emoji }: { emoji: string }) => (
  <Text style={{ fontSize: 22 }}>{emoji}</Text>
);

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
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => <TabIcon emoji="📊" />, headerTitle: 'Partner Dashboard' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions', tabBarIcon: () => <TabIcon emoji="💳" />, headerTitle: 'Live Feed' }} />
      <Tabs.Screen name="confirm" options={{ title: 'Confirm', tabBarIcon: () => <TabIcon emoji="✅" />, headerTitle: 'Confirm Redemption' }} />
    </Tabs>
  );
}
