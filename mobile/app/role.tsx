import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  useColorScheme,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/Button';

const PARTNER_CREDENTIALS: Record<string, string> = {
  'partner-jungfraujoch': 'Jungfraujoch Railway',
  'partner-victoria-restaurant': 'Hotel Victoria Restaurant',
  'partner-interlaken-adventure': 'Interlaken Adventure Sports',
  'partner-bakery': 'Grindelwald Bäckerei',
};

export default function RoleScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [partnerId, setPartnerId] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePartnerLogin = async () => {
    const name = PARTNER_CREDENTIALS[partnerId.toLowerCase()];
    if (!name) {
      Alert.alert('Invalid ID', 'Partner ID not found');
      return;
    }
    setLoading(true);
    await AsyncStorage.setItem('partnerId', partnerId.toLowerCase());
    await AsyncStorage.setItem('partnerName', name);
    await AsyncStorage.setItem('role', 'partner');
    router.replace('/(partner)');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Partner Login</Text>
        <Text style={[styles.subtitle, { color: colors.icon }]}>
          Enter your partner ID to access the dashboard
        </Text>
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        value={partnerId}
        onChangeText={setPartnerId}
        placeholder="Partner ID (e.g. partner-jungfraujoch)"
        placeholderTextColor={colors.icon}
        autoCapitalize="none"
      />
      <Button title="Access Dashboard" onPress={handlePartnerLogin} loading={loading} />
      <Button title="← Back" onPress={() => router.back()} variant="outline" style={{ marginTop: 8 }} />
      <Text style={[styles.hint, { color: colors.icon }]}>
        Demo IDs:{'\n'}partner-jungfraujoch · partner-victoria-restaurant{'\n'}partner-interlaken-adventure · partner-bakery
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 80, gap: 16 },
  header: { gap: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15 },
  input: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
