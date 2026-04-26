import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPartnerBookings, Booking } from '@/lib/bookingStore';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <View style={styles.card}>
      {/* Top row: confirmation code + confirmed badge */}
      <View style={styles.cardTopRow}>
        <View style={styles.codepill}>
          <Text style={styles.codeText}>{booking.confirmationCode}</Text>
        </View>
        <View style={styles.confirmedBadge}>
          <View style={styles.confirmedDot} />
          <Text style={styles.confirmedText}>Confirmed</Text>
        </View>
      </View>

      {/* Guest name */}
      <Text style={styles.guestName}>{booking.guestName}</Text>

      {/* Dates */}
      <View style={styles.datesRow}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Check-in</Text>
          <Text style={styles.dateValue}>{formatDate(booking.checkIn)}</Text>
        </View>
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateArrow}>›</Text>
          <View style={styles.dateLine} />
        </View>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>Check-out</Text>
          <Text style={styles.dateValue}>{formatDate(booking.checkOut)}</Text>
        </View>
      </View>

      {/* Footer: nights + tokens */}
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerValue}>{booking.nights}</Text>
          <Text style={styles.footerLabel}>{booking.nights === 1 ? 'night' : 'nights'}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={[styles.footerValue, { color: '#84CC16' }]}>{booking.totalTokens}</Text>
          <Text style={styles.footerLabel}>tokens</Text>
        </View>
      </View>
    </View>
  );
}

export default function BookingsScreen() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const pid = await AsyncStorage.getItem('partnerId');
      if (!pid) {
        setBookings([]);
        return;
      }
      const data = await getPartnerBookings(pid);
      // Sort newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setBookings(sorted);
    } catch (e) {
      console.warn('[BookingsScreen] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings]),
  );

  const totalTokens = bookings.reduce((sum, b) => sum + b.totalTokens, 0);
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#84CC16" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Reservations</Text>
        <Text style={styles.headerSub}>All confirmed bookings</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Total bookings</Text>
        </View>
        <View style={[styles.statCard, { marginLeft: 12 }]}>
          <Text style={[styles.statValue, { color: '#84CC16' }]}>{totalTokens}</Text>
          <Text style={styles.statLabel}>Tokens received</Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BookingCard booking={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏨</Text>
            <Text style={styles.emptyTitle}>No reservations yet</Text>
            <Text style={styles.emptySubtitle}>
              Bookings made by guests will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codepill: {
    backgroundColor: '#ECFCCB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3F6212',
    letterSpacing: 1,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 5,
  },
  confirmedText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  guestName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateBlock: {
    flex: 1,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dateLine: {
    width: 12,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateArrow: {
    fontSize: 16,
    color: '#9CA3AF',
    marginHorizontal: 2,
  },
  dateLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    alignItems: 'center',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
  },
  footerDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F3F4F6',
  },
  footerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  footerLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
