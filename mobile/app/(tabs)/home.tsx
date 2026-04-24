import React from 'react';
import { View, Text, ScrollView, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Card } from '@/components/Card';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.greeting, { color: colors.text }]}>
        Welcome to StartHack 👋
      </Text>

      <Card style={styles.card}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Stats</Text>
        <View style={styles.statsRow}>
          {[
            { label: 'Projects', value: '12' },
            { label: 'Teams', value: '4' },
            { label: 'Events', value: '8' },
          ].map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      {[
        { title: 'New hackathon registered', time: '2h ago', emoji: '🎉' },
        { title: 'Team formed: AI Squad', time: '5h ago', emoji: '👥' },
        { title: 'Project submitted', time: '1d ago', emoji: '🚀' },
      ].map((item, i) => (
        <Card key={i} style={styles.activityCard}>
          <Text style={styles.activityEmoji}>{item.emoji}</Text>
          <View>
            <Text style={[styles.activityTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.activityTime, { color: colors.icon }]}>{item.time}</Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  greeting: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  card: { marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityEmoji: { fontSize: 24 },
  activityTitle: { fontSize: 14, fontWeight: '600' },
  activityTime: { fontSize: 12, marginTop: 2 },
});
