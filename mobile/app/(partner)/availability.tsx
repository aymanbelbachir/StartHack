import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAvailability, setAvailability, Availability } from '@/lib/bookingStore';

export default function AvailabilityScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partnerId, setPartnerId] = useState<string>('');

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxRooms, setMaxRooms] = useState(1);
  const [bookedRooms, setBookedRooms] = useState(0);
  const [pricePerNight, setPricePerNight] = useState('');
  const [roomType, setRoomType] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pid = await AsyncStorage.getItem('partnerId');
      if (!pid) {
        setLoading(false);
        return;
      }
      setPartnerId(pid);

      const avail = await getAvailability(pid);
      if (avail) {
        setEnabled(avail.enabled);
        setStartDate(avail.startDate);
        setEndDate(avail.endDate);
        setMaxRooms(avail.maxRooms);
        setBookedRooms(avail.bookedRooms);
        setPricePerNight(String(avail.pricePerNight));
        setRoomType(avail.roomType);
      }
    } catch (e) {
      console.warn('[AvailabilityScreen] load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleSave = async () => {
    if (!partnerId) {
      Alert.alert('Error', 'Partner ID not found. Please log in again.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Validation', 'Please enter both check-in and check-out dates.');
      return;
    }

    setSaving(true);
    try {
      const avail: Availability = {
        enabled,
        startDate,
        endDate,
        maxRooms,
        bookedRooms,
        pricePerNight: Number(pricePerNight) || 0,
        roomType,
      };
      await setAvailability(partnerId, avail);
      Alert.alert('Saved', 'Availability settings updated successfully.');
    } catch (e) {
      console.warn('[AvailabilityScreen] save error', e);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const decrementRooms = () => setMaxRooms((prev) => Math.max(1, prev - 1));
  const incrementRooms = () => setMaxRooms((prev) => Math.min(50, prev + 1));

  const bookedRatio = maxRooms > 0 ? Math.min(bookedRooms / maxRooms, 1) : 0;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#84CC16" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Availability Settings</Text>
      </View>

      {/* Card 1: Booking Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Booking Status</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Accept Bookings</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#E5E7EB', true: '#84CC16' }}
            thumbColor="#FFFFFF"
          />
        </View>
        {enabled && (
          <View style={styles.greenBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.greenBadgeText}>Accepting reservations</Text>
          </View>
        )}
      </View>

      {/* Card 2: Availability Window */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Availability Window</Text>

        <Text style={styles.fieldLabel}>Check-in from</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Check-out until</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />
      </View>

      {/* Card 3: Room Settings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Room Settings</Text>

        <Text style={styles.fieldLabel}>Max Rooms</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepperBtn} onPress={decrementRooms}>
            <Text style={styles.stepperBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{maxRooms}</Text>
          <TouchableOpacity style={styles.stepperBtn} onPress={incrementRooms}>
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Price per night (tokens)</Text>
        <TextInput
          style={styles.input}
          value={pricePerNight}
          onChangeText={setPricePerNight}
          placeholder="e.g. 150"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Room Type</Text>
        <TextInput
          style={styles.input}
          value={roomType}
          onChangeText={setRoomType}
          placeholder="e.g. Double Room"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Card 4: Current Bookings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Bookings</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${bookedRatio * 100}%` as `${number}%` }]} />
        </View>

        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Rooms booked</Text>
          <Text style={styles.progressCount}>
            {bookedRooms} / {maxRooms}
          </Text>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#111827" />
        ) : (
          <Text style={styles.saveBtnText}>Save Settings</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  greenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  greenBadgeText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 48,
    textAlign: 'center',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#84CC16',
    borderRadius: 5,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressCount: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#84CC16',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },
});
