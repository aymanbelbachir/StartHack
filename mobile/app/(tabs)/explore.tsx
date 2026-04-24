import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/Card';

const HACKATHONS = [
  { id: 1, name: 'StartHack 2026', location: 'St. Gallen', date: 'Mar 18-20', participants: 600, emoji: '🏆' },
  { id: 2, name: 'ETH Zurich Hack', location: 'Zurich', date: 'Apr 5-7', participants: 400, emoji: '⚡' },
  { id: 3, name: 'EPFL Hackfest', location: 'Lausanne', date: 'May 2-4', participants: 300, emoji: '🔬' },
  { id: 4, name: 'Geneva Tech Hack', location: 'Geneva', date: 'Jun 12-14', participants: 250, emoji: '🌍' },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [search, setSearch] = useState('');

  const filtered = HACKATHONS.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <TextInput
        style={[
          styles.search,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border,
          },
        ]}
        value={search}
        onChangeText={setSearch}
        placeholder="Search hackathons..."
        placeholderTextColor={colors.icon}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {filtered.length} Events Found
      </Text>

      {filtered.map((hackathon) => (
        <Card key={hackathon.id} style={styles.hackathonCard}>
          <Text style={styles.emoji}>{hackathon.emoji}</Text>
          <View style={styles.info}>
            <Text style={[styles.hackathonName, { color: colors.text }]}>{hackathon.name}</Text>
            <Text style={[styles.hackathonMeta, { color: colors.icon }]}>
              📍 {hackathon.location} · 📅 {hackathon.date}
            </Text>
            <Text style={[styles.participants, { color: colors.primary }]}>
              👥 {hackathon.participants} participants
            </Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  search: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  hackathonCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji: { fontSize: 32 },
  info: { flex: 1, gap: 4 },
  hackathonName: { fontSize: 16, fontWeight: '700' },
  hackathonMeta: { fontSize: 13 },
  participants: { fontSize: 13, fontWeight: '600' },
});
