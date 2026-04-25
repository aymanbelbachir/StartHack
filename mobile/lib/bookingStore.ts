import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

export interface Availability {
  enabled: boolean;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  maxRooms: number;
  bookedRooms: number;
  pricePerNight: number; // tokens
  roomType: string;
}

export interface Booking {
  id: string;
  userId: string;
  guestName: string;
  partnerId: string;
  partnerName: string;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  nights: number;
  totalTokens: number;
  confirmationCode: string; // e.g. "JFP-A7K2M9"
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1

export function generateConfirmationCode(): string {
  let code = 'JFP-';
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return code;
}

// ─── Availability ────────────────────────────────────────────────────────────

export async function getAvailability(partnerId: string): Promise<Availability | null> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const ref = doc(db, 'partners', partnerId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.availability) {
          return data.availability as Availability;
        }
      }
    } catch (e) {
      console.warn('[bookingStore] Firestore getAvailability failed, falling back', e);
    }
  }

  // Local fallback
  try {
    const raw = await AsyncStorage.getItem('partner_availability');
    if (raw) {
      return JSON.parse(raw) as Availability;
    }
  } catch (e) {
    console.warn('[bookingStore] AsyncStorage getAvailability failed', e);
  }
  return null;
}

export async function setAvailability(partnerId: string, avail: Availability): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const ref = doc(db, 'partners', partnerId);
      await setDoc(ref, { availability: avail }, { merge: true });
    } catch (e) {
      console.warn('[bookingStore] Firestore setAvailability failed, falling back', e);
    }
  }

  // Always persist locally too
  try {
    await AsyncStorage.setItem('partner_availability', JSON.stringify(avail));
  } catch (e) {
    console.warn('[bookingStore] AsyncStorage setAvailability failed', e);
  }
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getPartnerBookings(partnerId: string): Promise<Booking[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'bookings'),
        where('partnerId', '==', partnerId),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
    } catch (e) {
      console.warn('[bookingStore] Firestore getPartnerBookings failed, falling back', e);
    }
  }

  // Local fallback
  try {
    const raw = await AsyncStorage.getItem('bookings');
    if (raw) {
      const all: Booking[] = JSON.parse(raw);
      return all.filter((b) => b.partnerId === partnerId);
    }
  } catch (e) {
    console.warn('[bookingStore] AsyncStorage getPartnerBookings failed', e);
  }
  return [];
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
    } catch (e) {
      console.warn('[bookingStore] Firestore getUserBookings failed, falling back', e);
    }
  }

  // Local fallback
  try {
    const raw = await AsyncStorage.getItem('bookings');
    if (raw) {
      const all: Booking[] = JSON.parse(raw);
      return all.filter((b) => b.userId === userId);
    }
  } catch (e) {
    console.warn('[bookingStore] AsyncStorage getUserBookings failed', e);
  }
  return [];
}

function calcNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export async function createBooking(params: {
  userId: string;
  guestName: string;
  partnerId: string;
  partnerName: string;
  checkIn: string;
  checkOut: string;
  totalTokens: number;
}): Promise<Booking> {
  const { userId, guestName, partnerId, partnerName, checkIn, checkOut, totalTokens } = params;
  const confirmationCode = generateConfirmationCode();
  const nights = calcNights(checkIn, checkOut);
  const createdAt = new Date().toISOString();

  const bookingData: Omit<Booking, 'id'> = {
    userId,
    guestName,
    partnerId,
    partnerName,
    checkIn,
    checkOut,
    nights,
    totalTokens,
    confirmationCode,
    status: 'confirmed',
    createdAt,
  };

  let savedId = `local_${Date.now()}`;

  if (FIREBASE_CONFIGURED && db) {
    try {
      const { collection, addDoc, doc, getDoc, setDoc } = await import('firebase/firestore');

      // Save booking
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      savedId = docRef.id;

      // Increment bookedRooms on partner doc
      const partnerRef = doc(db, 'partners', partnerId);
      const partnerSnap = await getDoc(partnerRef);
      if (partnerSnap.exists()) {
        const current = partnerSnap.data();
        const currentBooked: number = current?.availability?.bookedRooms ?? 0;
        await setDoc(
          partnerRef,
          { availability: { bookedRooms: currentBooked + 1 } },
          { merge: true },
        );
      }
    } catch (e) {
      console.warn('[bookingStore] Firestore createBooking failed, falling back', e);
      savedId = `local_${Date.now()}`;
    }
  }

  const booking: Booking = { id: savedId, ...bookingData };

  // Always persist locally
  try {
    const raw = await AsyncStorage.getItem('bookings');
    const all: Booking[] = raw ? JSON.parse(raw) : [];
    all.push(booking);
    await AsyncStorage.setItem('bookings', JSON.stringify(all));

    // Update local availability bookedRooms
    const availRaw = await AsyncStorage.getItem('partner_availability');
    if (availRaw) {
      const avail: Availability = JSON.parse(availRaw);
      avail.bookedRooms = (avail.bookedRooms ?? 0) + 1;
      await AsyncStorage.setItem('partner_availability', JSON.stringify(avail));
    }
  } catch (e) {
    console.warn('[bookingStore] AsyncStorage createBooking persist failed', e);
  }

  return booking;
}
