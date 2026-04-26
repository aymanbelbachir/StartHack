import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, TextInput, ScrollView,
  Animated, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Dimensions, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { saveUserSnapshot } from '@/lib/userStore';
import { getAvailability, createBooking } from '@/lib/bookingStore';
import type { Availability, Booking } from '@/lib/bookingStore';
import QRCode from 'react-native-qrcode-svg';
import type { WalletData } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';
import type { Transaction } from '@/hooks/useTransactions';
import Svg, { Path, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

// ─── chart constants ──────────────────────────────────────────────────────────
const CHART_W = Dimensions.get('window').width - 88;
const PLOT_H = 48;
const CHART_H = 68;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── chart helpers ────────────────────────────────────────────────────────────
function buildLast7() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: DAY_NAMES[d.getDay()], date: new Date(d) };
  });
}

function toDate(ts: any): Date {
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  if (ts?.toDate) return ts.toDate();
  return new Date(0);
}

function aggregateByDay(txns: Transaction[], days: ReturnType<typeof buildLast7>) {
  return days.map(({ date }) => {
    const s = new Date(date); s.setHours(0, 0, 0, 0);
    const e = new Date(date); e.setHours(23, 59, 59, 999);
    return txns
      .filter(tx => tx.type === 'payment' && (tx.amount ?? 0) > 0)
      .filter(tx => { const t = toDate(tx.timestamp); return t >= s && t <= e; })
      .reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
  });
}

// ─── spending chart ───────────────────────────────────────────────────────────
function SpendingChart({ data, labels }: { data: number[]; labels: string[] }) {
  const maxVal = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: (1 - v / maxVal) * PLOT_H,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${CHART_W.toFixed(1)},${PLOT_H} L0,${PLOT_H} Z`;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Path d={area} fill="#A3E635" fillOpacity={0.15} />
      <Path d={line} stroke="#A3E635" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#FFFFFF" stroke="#A3E635" strokeWidth={2} />
      ))}
      {labels.map((label, i) => (
        <SvgText
          key={label}
          x={(i / (labels.length - 1)) * CHART_W}
          y={CHART_H - 4}
          textAnchor="middle"
          fill="#4B5563"
          fontSize={9}
        >
          {label}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── partner data (visual fallback) ──────────────────────────────────────────
const PARTNERS_META = [
  { id: 'partner-jungfraujoch',         name: 'Jungfraujoch Railway',       type: 'Transport',    color: '#2563EB', imageUrl: 'https://images.unsplash.com/photo-1613989937169-d7030ca9f7ab?w=400&q=80' },
  { id: 'partner-victoria-restaurant',  name: 'Hotel Victoria Restaurant',  type: 'Restaurant',   color: '#DB2777', imageUrl: 'https://images.unsplash.com/photo-1733551629631-47d5923a2a98?w=400&q=80' },
  { id: 'partner-interlaken-adventure', name: 'Interlaken Adventure Sports', type: 'Activity',    color: '#0D9488', imageUrl: 'https://images.unsplash.com/photo-1605548109944-9040d0972bf5?w=400&q=80' },
  { id: 'partner-bakery',               name: 'Grindelwald Bäckerei',       type: 'Food & Drink', color: '#D97706', imageUrl: 'https://images.unsplash.com/photo-1753011767176-7602e5e8619a?w=400&q=80' },
];
// keep alias for QR legacy matching
const PARTNERS = PARTNERS_META;

// ─── Firestore partner type ───────────────────────────────────────────────────
interface FSPartner {
  id: string;
  name: string;
  type: string;
  color: string;
  imageUrl: string;
  currentPrice: number;
}

// ─── date helpers ─────────────────────────────────────────────────────────────
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(d: Date) {
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}
function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function nightsBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

// ─── types ────────────────────────────────────────────────────────────────────
interface SuccessInfo {
  partnerName: string;
  amount: number;
  points: number;
  txId: string;
  timestamp: string;
  mode: 'pay' | 'redeem';
}

// ─── icons ────────────────────────────────────────────────────────────────────
const CheckSvg = () => (
  <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke="#A3E635" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchSvg = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke="#6B7280" strokeWidth="2" />
    <Path d="M21 21l-4.35-4.35" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const ChevRightSvg = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const CamSvg = () => (
  <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#6B7280" strokeWidth="1.5" />
    <Circle cx="12" cy="13" r="4" stroke="#6B7280" strokeWidth="1.5" />
  </Svg>
);

const ImgSvg = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke="#6B7280" strokeWidth="1.5" />
    <Circle cx="8.5" cy="8.5" r="1.5" stroke="#6B7280" strokeWidth="1.5" />
    <Path d="M21 15l-5-5L5 21" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const CardSvg = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="5" width="20" height="14" rx="2" stroke="#6B7280" strokeWidth="1.5" />
    <Path d="M2 10h20" stroke="#6B7280" strokeWidth="1.5" />
  </Svg>
);

// ─── main component ───────────────────────────────────────────────────────────
export default function ScanScreen() {
  // ── existing state (unchanged) ──
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'pay' | 'redeem' | 'book'>('pay');
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;


  // ── new ui state ──
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string; color: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // firestore partners
  const [fsPartners, setFsPartners] = useState<FSPartner[]>([]);

  // booking state
  const [checkIn, setCheckIn] = useState<Date>(() => addDays(new Date(), 1));
  const [checkOut, setCheckOut] = useState<Date>(() => addDays(new Date(), 2));
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [bookingConfirm, setBookingConfirm] = useState<Booking | null>(null);

  // ── spending chart data ──
  const { transactions } = useTransactions(userId);
  const last7 = buildLast7();
  const chartData = aggregateByDay(transactions, last7);
  const weeklySpent = chartData.reduce((s, v) => s + v, 0);

  // animated scan line
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    AsyncStorage.getItem('userId').then(setUserId);
    // Load partners from Firestore
    if (FIREBASE_CONFIGURED && db) {
      (async () => {
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db!, 'partners'));
        const fps: FSPartner[] = snap.docs.map(d => {
          const meta = PARTNERS_META.find(p => p.id === d.id);
          return {
            id: d.id,
            name: d.data().name ?? meta?.name ?? d.id,
            type: d.data().type ?? meta?.type ?? 'Partner',
            color: meta?.color ?? '#6B7280',
            imageUrl: meta?.imageUrl ?? '',
            currentPrice: d.data().currentPrice ?? 0,
          };
        });
        if (fps.length > 0) setFsPartners(fps);
      })();
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240] });

  // ── existing logic (unchanged) ──
  const showSuccess = (info: SuccessInfo) => {
    setSuccessInfo(info);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
  };

  const resetForm = () => {
    setSuccessInfo(null);
    scaleAnim.setValue(0);
    setPartnerId('');
    setAmount('');
    setModalVisible(false);
  };

  const handleAction = async () => {
    if (!partnerId) { Alert.alert('Missing', 'Enter a partner ID'); return; }
    if (mode === 'pay' && (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0)) {
      Alert.alert('Missing', 'Enter a valid token amount'); return;
    }
    const tokenAmt = parseInt(amount) || 0;
    const partnerName = PARTNER_NAMES[partnerId] ?? partnerId;

    Alert.alert(
      'Confirm',
      mode === 'pay' ? `Pay ${tokenAmt} tokens to ${partnerName}?` : `Redeem benefit at ${partnerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const userId = await AsyncStorage.getItem('userId') ?? '';
              if (FIREBASE_CONFIGURED && db) {
                await processFirebaseTransaction(userId, partnerName, tokenAmt);
              } else {
                await processLocalTransaction(userId, partnerName, tokenAmt);
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const processLocalTransaction = async (userId: string, partnerName: string, tokenAmt: number) => {
    const raw = await AsyncStorage.getItem('wallet_data');
    if (!raw) { Alert.alert('Error', 'Wallet not found'); return; }
    const wallet: WalletData = JSON.parse(raw);
    if (mode === 'pay') {
      if (wallet.tokenBalance < tokenAmt) { Alert.alert('Insufficient tokens', `Balance: ${wallet.tokenBalance}`); return; }
      wallet.tokenBalance -= tokenAmt;
      wallet.pointsBalance = (wallet.pointsBalance ?? 0) + 10;
    }
    await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));

    // Credit the partner's balance
    if (mode === 'pay' && tokenAmt > 0) {
      const rawBalances = await AsyncStorage.getItem('partner_balances');
      const balances: Record<string, number> = rawBalances ? JSON.parse(rawBalances) : {};
      balances[partnerId] = (balances[partnerId] ?? 0) + tokenAmt;
      await AsyncStorage.setItem('partner_balances', JSON.stringify(balances));
    }

    const txId = `tx-${Date.now()}`;
    const tx = {
      id: txId, fromUserId: userId, toPartnerId: partnerId,
      amount: mode === 'pay' ? tokenAmt : 0, pointsAwarded: mode === 'pay' ? 10 : 0,
      type: mode === 'pay' ? 'payment' : 'benefit_redemption', benefitId: null,
      timestamp: new Date().toISOString(), status: 'confirmed', partnerName,
    };
    const existing = JSON.parse((await AsyncStorage.getItem('transactions')) ?? '[]');
    await AsyncStorage.setItem('transactions', JSON.stringify([tx, ...existing]));
    await saveUserSnapshot();
    showSuccess({ partnerName, amount: tokenAmt, points: mode === 'pay' ? 10 : 0, txId, timestamp: new Date().toLocaleString(), mode });
  };

  const processFirebaseTransaction = async (userId: string, partnerName: string, tokenAmt: number) => {
    try {
      const { collection, addDoc, doc, updateDoc, getDoc, setDoc, increment, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db!, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      const data = userSnap.data();
      if (mode === 'pay') {
        if (data.tokenBalance < tokenAmt) throw new Error(`Insufficient tokens (balance: ${data.tokenBalance})`);
        // Deduct from guest
        await updateDoc(userRef, { tokenBalance: data.tokenBalance - tokenAmt, pointsBalance: (data.pointsBalance ?? 0) + 10 });
        // Credit partner — create or update partner document
        const partnerRef = doc(db!, 'partners', partnerId);
        await setDoc(partnerRef, { tokenBalance: increment(tokenAmt), name: partnerName }, { merge: true });
      }
      const docRef = await addDoc(collection(db!, 'transactions'), {
        fromUserId: userId, toPartnerId: partnerId,
        amount: mode === 'pay' ? tokenAmt : 0, pointsAwarded: mode === 'pay' ? 10 : 0,
        type: mode === 'pay' ? 'payment' : 'benefit_redemption', benefitId: null,
        timestamp: serverTimestamp(), status: 'confirmed', partnerName,
      });
      // keep local cache in sync so home screen dropdown shows it
      const localTx = {
        id: docRef.id, fromUserId: userId, toPartnerId: partnerId,
        amount: mode === 'pay' ? tokenAmt : 0, pointsAwarded: mode === 'pay' ? 10 : 0,
        type: mode === 'pay' ? 'payment' : 'benefit_redemption', benefitId: null,
        timestamp: new Date().toISOString(), status: 'confirmed', partnerName,
      };
      const existing = JSON.parse((await AsyncStorage.getItem('transactions')) ?? '[]');
      await AsyncStorage.setItem('transactions', JSON.stringify([localTx, ...existing]));
      showSuccess({ partnerName, amount: tokenAmt, points: mode === 'pay' ? 10 : 0, txId: docRef.id.slice(0, 8).toUpperCase(), timestamp: new Date().toLocaleString(), mode });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Transaction failed');
    }
  };

  // ── camera ──
  const handleScanNow = async () => {
    if (cameraActive) { setCameraActive(false); setScanned(false); return; }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission required', 'Camera access is needed to scan QR codes');
        return;
      }
    }
    setScanned(false);
    setCameraActive(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setCameraActive(false);
    // Try JFP dynamic payment payload
    try {
      const payload = JSON.parse(data);
      if (payload.id && payload.name && typeof payload.amount === 'number') {
        handleAutoPayFromQR(payload);
        return;
      }
    } catch {}
    // Legacy: match by partnerId string
    const meta = PARTNERS_META.find(p => p.id === data || data.includes(p.id));
    if (meta) {
      handleSelectPartner({ ...meta, currentPrice: 0 });
    } else {
      Alert.alert('QR Code Scanned', `Content: ${data}`, [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  // ── gallery ──
  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to pick a QR code');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      Alert.alert('Image Selected', 'QR code reading from gallery coming soon.');
    }
  };

  // ── seamless auto-pay from QR payload ──────────────────────────────────────
  const handleAutoPayFromQR = async (payload: { id: string; name: string; amount: number }) => {
    const { id: pid, name: pname, amount: amt } = payload;
    const raw = await AsyncStorage.getItem('wallet_data');
    if (!raw) { Alert.alert('Error', 'Wallet not found'); setScanned(false); return; }
    const wallet = JSON.parse(raw);
    if (wallet.tokenBalance < amt) {
      Alert.alert('Insufficient tokens', `You need ${amt} tokens but only have ${wallet.tokenBalance}.`);
      setScanned(false);
      return;
    }
    setLoading(true);
    try {
      wallet.tokenBalance -= amt;
      wallet.pointsBalance = (wallet.pointsBalance ?? 0) + 10;
      await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));

      const rawBal = await AsyncStorage.getItem('partner_balances');
      const balances: Record<string, number> = rawBal ? JSON.parse(rawBal) : {};
      balances[pid] = (balances[pid] ?? 0) + amt;
      await AsyncStorage.setItem('partner_balances', JSON.stringify(balances));

      let txId = `tx-${Date.now()}`;
      const guestName = wallet.name ?? 'Guest';

      if (FIREBASE_CONFIGURED && db) {
        const { doc, addDoc, collection, updateDoc, setDoc, increment, serverTimestamp } = await import('firebase/firestore');
        const uId = userId ?? '';
        if (uId) await updateDoc(doc(db!, 'users', uId), { tokenBalance: wallet.tokenBalance, pointsBalance: wallet.pointsBalance });
        const txRef = await addDoc(collection(db!, 'transactions'), {
          fromUserId: uId, toPartnerId: pid, amount: amt, pointsAwarded: 10,
          type: 'payment', benefitId: null,
          timestamp: serverTimestamp(), status: 'confirmed', partnerName: pname,
        });
        txId = txRef.id.slice(0, 8).toUpperCase();
        // Write to partner doc — triggers real-time notification on partner device
        await setDoc(doc(db!, 'partners', pid), {
          tokenBalance: increment(amt),
          name: pname,
          lastPayment: { amount: amt, guestName, txId: txRef.id, timestamp: serverTimestamp() },
        }, { merge: true });
      } else {
        const tx = {
          id: txId, fromUserId: userId ?? '', toPartnerId: pid,
          amount: amt, pointsAwarded: 10, type: 'payment', benefitId: null,
          timestamp: new Date().toISOString(), status: 'confirmed', partnerName: pname,
        };
        const existing = JSON.parse((await AsyncStorage.getItem('transactions')) ?? '[]');
        await AsyncStorage.setItem('transactions', JSON.stringify([tx, ...existing]));
      }

      await saveUserSnapshot();
      const meta = PARTNERS_META.find(p => p.id === pid);
      setSelectedPartner({ id: pid, name: pname, color: meta?.color ?? '#A3E635' });
      showSuccess({ partnerName: pname, amount: amt, points: 10, txId, timestamp: new Date().toLocaleString(), mode: 'pay' });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Payment failed');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  // ── partner selection ──
  const handleSelectPartner = async (p: FSPartner) => {
    setPartnerId(p.id);
    setSelectedPartner({ id: p.id, name: p.name, color: p.color });
    // Pre-fill price from Firestore data or fetch it
    if (p.currentPrice > 0) {
      setAmount(String(p.currentPrice));
    } else if (FIREBASE_CONFIGURED && db) {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db!, 'partners', p.id));
      setAmount(snap.exists() && snap.data().currentPrice ? String(snap.data().currentPrice) : '');
    } else {
      setAmount('');
    }
    setAvailability(null);
    setCheckIn(addDays(new Date(), 1));
    setCheckOut(addDays(new Date(), 2));
    getAvailability(p.id).then(setAvailability);
    setModalVisible(true);
  };

  // ── book hotel ──
  const handleBook = async () => {
    if (!availability?.enabled) { Alert.alert('Not available', 'This partner is not accepting bookings.'); return; }
    const roomsLeft = availability.maxRooms - availability.bookedRooms;
    if (roomsLeft <= 0) { Alert.alert('Sold out', 'No rooms available for these dates.'); return; }
    const nights = nightsBetween(checkIn, checkOut);
    const total = nights * (availability.pricePerNight ?? 0);
    const raw = await AsyncStorage.getItem('wallet_data');
    if (!raw) return;
    const wallet = JSON.parse(raw);
    if (wallet.tokenBalance < total) {
      Alert.alert('Insufficient tokens', `You need ${total} tokens but have ${wallet.tokenBalance}.`);
      return;
    }
    Alert.alert(
      'Confirm Booking',
      `${selectedPartner?.name}\n${formatDateLabel(checkIn)} → ${formatDateLabel(checkOut)}\n${nights} night${nights > 1 ? 's' : ''} · ${total} tokens`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: async () => {
            setLoading(true);
            try {
              // Debit guest wallet
              wallet.tokenBalance -= total;
              await AsyncStorage.setItem('wallet_data', JSON.stringify(wallet));
              // Credit partner (local)
              const rawBalances = await AsyncStorage.getItem('partner_balances');
              const balances: Record<string, number> = rawBalances ? JSON.parse(rawBalances) : {};
              balances[partnerId] = (balances[partnerId] ?? 0) + total;
              await AsyncStorage.setItem('partner_balances', JSON.stringify(balances));
              // Sync to Firestore (keeps home screen balance live)
              if (FIREBASE_CONFIGURED && db && userId) {
                const { doc, updateDoc, setDoc, increment } = await import('firebase/firestore');
                await updateDoc(doc(db!, 'users', userId), { tokenBalance: wallet.tokenBalance });
                await setDoc(doc(db!, 'partners', partnerId), { tokenBalance: increment(total) }, { merge: true });
              }
              // Create booking
              const booking = await createBooking({
                userId: userId ?? 'guest',
                guestName: wallet.name ?? 'Guest',
                partnerId,
                partnerName: selectedPartner?.name ?? '',
                checkIn: toISODate(checkIn),
                checkOut: toISODate(checkOut),
                totalTokens: total,
              });
              await saveUserSnapshot();
              setModalVisible(false);
              setBookingConfirm(booking);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Booking failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Merge Firestore partners with local visual metadata
  const displayPartners: FSPartner[] = (fsPartners.length > 0 ? fsPartners : PARTNERS_META.map(p => ({ ...p, currentPrice: 0 })))
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ── success screen (dark) ──
  if (successInfo) {
    return (
      <ScrollView style={dark.successBg} contentContainerStyle={dark.successContent}>
        <StatusBar style="light" />
        <Animated.View style={[dark.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <CheckSvg />
        </Animated.View>
        <Text style={dark.successTitle}>
          {successInfo.mode === 'pay' ? 'Payment Success!' : 'Benefit Redeemed!'}
        </Text>
        <Text style={dark.successSub}>Transaction confirmed</Text>

        <View style={dark.receipt}>
          <View style={dark.receiptPartner}>
            <View style={[dark.partnerDot, { backgroundColor: selectedPartner?.color ?? '#A3E635' }]} />
            <Text style={dark.partnerName}>{successInfo.partnerName}</Text>
            <CheckSvg />
          </View>
          <View style={dark.dash} />
          {successInfo.amount > 0 && (
            <View style={dark.row}><Text style={dark.rowLabel}>Amount</Text><Text style={dark.rowVal}>{successInfo.amount} Tokens</Text></View>
          )}
          {successInfo.points > 0 && (
            <View style={dark.row}><Text style={dark.rowLabel}>Points Earned</Text><Text style={[dark.rowVal, { color: '#A3E635' }]}>+{successInfo.points} pts</Text></View>
          )}
          <View style={dark.row}><Text style={dark.rowLabel}>Status</Text><Text style={[dark.rowVal, { color: '#A3E635' }]}>Confirmed</Text></View>
          <View style={dark.row}><Text style={dark.rowLabel}>Ref</Text><Text style={dark.rowValSm}>{successInfo.txId}</Text></View>
          <View style={dark.row}><Text style={dark.rowLabel}>Time</Text><Text style={dark.rowValSm}>{successInfo.timestamp}</Text></View>
          <View style={dark.dash} />
          <View style={dark.row}>
            <Text style={dark.totalLabel}>Total</Text>
            <Text style={[dark.totalLabel, { color: '#A3E635' }]}>
              {successInfo.amount > 0 ? `${successInfo.amount} 🪙` : 'Benefit'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={dark.doneBtn} onPress={resetForm} activeOpacity={0.85}>
          <Text style={dark.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── main screen ──
  return (
    <>
      <StatusBar style="dark" />
      <View style={s.container}>
        {/* header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Scan and Pay</Text>
          <Text style={s.headerSub}>Align the camera with the QR code or search a partner</Text>
        </View>


        {/* tab toggle */}
        <View style={s.tabRow}>
          {(['scan', 'manual'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.85}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab === 'scan' ? 'Scan QR' : 'Enter Name'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* spending chart — always visible below tab toggle */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Weekly Spending</Text>
            <Text style={s.chartSub}>{weeklySpent > 0 ? `${weeklySpent} 🪙 this week` : 'No spending yet'}</Text>
          </View>
          <SpendingChart data={chartData} labels={last7.map(d => d.label)} />
        </View>

        {activeTab === 'scan' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
            {/* QR viewfinder */}
            <View style={s.viewfinder}>
              {cameraActive ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleBarCodeScanned}
                />
              ) : (
                <View style={s.vfInner}>
                  <CamSvg />
                  <Text style={s.vfText}>Tap "Scan" to open the camera</Text>
                </View>
              )}
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
              {cameraActive && (
                <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]} />
              )}
            </View>

            {/* scan now */}
            <TouchableOpacity style={[s.scanNowBtn, cameraActive && s.scanNowBtnActive]} onPress={handleScanNow} activeOpacity={0.85}>
              <Text style={s.scanNowText}>{cameraActive ? 'Stop Scan' : 'Scan Now'}</Text>
            </TouchableOpacity>

            {/* utility buttons */}
            <View style={s.utilRow}>
              <TouchableOpacity style={s.utilBtn} onPress={handleGallery} activeOpacity={0.8}>
                <ImgSvg />
                <Text style={s.utilLabel}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.utilBtn} onPress={() => setActiveTab('manual')} activeOpacity={0.8}>
                <CardSvg />
                <Text style={s.utilLabel}>Manual</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* search */}
            <View style={s.searchBox}>
              <SearchSvg />
              <TextInput
                style={s.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search partner name..."
                placeholderTextColor="#4B5563"
              />
            </View>

            {/* partner list — from Firestore */}
            {displayPartners.map(p => (
              <TouchableOpacity
                key={p.id}
                style={s.partnerRow}
                onPress={() => handleSelectPartner(p)}
                activeOpacity={0.8}
              >
                {p.imageUrl
                  ? <Image source={{ uri: p.imageUrl }} style={s.partnerIcon} resizeMode="cover" />
                  : <View style={[s.partnerIcon, { backgroundColor: p.color, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 20 }}>🏪</Text></View>
                }
                <View style={s.partnerMid}>
                  <Text style={s.partnerName2}>{p.name}</Text>
                  <Text style={s.partnerType}>
                    {p.type}{p.currentPrice > 0 ? ` · ${p.currentPrice} tokens` : ''}
                  </Text>
                </View>
                {p.currentPrice > 0 && (
                  <View style={s.pricePill}>
                    <Text style={s.pricePillText}>{p.currentPrice} 🪙</Text>
                  </View>
                )}
                <ChevRightSvg />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* booking confirmation modal */}
        <Modal
          visible={!!bookingConfirm}
          transparent
          animationType="slide"
          onRequestClose={() => setBookingConfirm(null)}
        >
          <View style={s.confirmOverlay}>
            <View style={s.confirmSheet}>
              <Text style={s.confirmTitle}>Booking Confirmed!</Text>
              <Text style={s.confirmSub}>Show this QR code at check-in</Text>

              {bookingConfirm && (
                <View style={s.qrWrap}>
                  <QRCode
                    value={bookingConfirm.confirmationCode}
                    size={180}
                    color="#111827"
                    backgroundColor="#FFFFFF"
                  />
                </View>
              )}

              <View style={s.confirmCodePill}>
                <Text style={s.confirmCodeText}>{bookingConfirm?.confirmationCode}</Text>
              </View>

              <View style={s.confirmDetails}>
                <View style={s.confirmRow}>
                  <Text style={s.confirmRowLabel}>Hotel</Text>
                  <Text style={s.confirmRowVal}>{bookingConfirm?.partnerName}</Text>
                </View>
                <View style={s.confirmRow}>
                  <Text style={s.confirmRowLabel}>Guest</Text>
                  <Text style={s.confirmRowVal}>{bookingConfirm?.guestName}</Text>
                </View>
                <View style={s.confirmRow}>
                  <Text style={s.confirmRowLabel}>Check-in</Text>
                  <Text style={s.confirmRowVal}>{bookingConfirm?.checkIn}</Text>
                </View>
                <View style={s.confirmRow}>
                  <Text style={s.confirmRowLabel}>Check-out</Text>
                  <Text style={s.confirmRowVal}>{bookingConfirm?.checkOut}</Text>
                </View>
                <View style={s.confirmRow}>
                  <Text style={s.confirmRowLabel}>Nights</Text>
                  <Text style={s.confirmRowVal}>{bookingConfirm?.nights}</Text>
                </View>
                <View style={[s.confirmRow, s.confirmRowTotal]}>
                  <Text style={s.confirmTotalLabel}>Total Paid</Text>
                  <Text style={s.confirmTotalVal}>{bookingConfirm?.totalTokens} 🪙</Text>
                </View>
              </View>

              <TouchableOpacity
                style={s.confirmDoneBtn}
                onPress={() => setBookingConfirm(null)}
                activeOpacity={0.85}
              >
                <Text style={s.confirmDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* payment modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.modal}>
              {/* partner row */}
              <View style={s.modalPartner}>
                <Image
                  source={{ uri: PARTNERS_META.find(p => p.id === selectedPartner?.id)?.imageUrl }}
                  style={s.modalPartnerIcon}
                  resizeMode="cover"
                />
                <Text style={s.modalPartnerName}>{selectedPartner?.name}</Text>
              </View>

              {/* mode toggle */}
              <View style={s.modalModeRow}>
                {(['pay', 'redeem', 'book'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.modeBtn, mode === m && s.modeBtnActive]}
                    onPress={() => setMode(m)}
                  >
                    <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                      {m === 'pay' ? 'Pay' : m === 'redeem' ? 'Redeem' : 'Book'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {mode === 'pay' && (
                <>
                  <Text style={s.amtLabel}>Amount (tokens)</Text>
                  <TextInput
                    style={s.amtInput}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#4B5563"
                  />
                  <View style={s.amtBtns}>
                    {[1, 5, 10, 20].map(n => (
                      <TouchableOpacity
                        key={n}
                        style={s.amtShortcut}
                        onPress={() => setAmount(String(n))}
                        activeOpacity={0.8}
                      >
                        <Text style={s.amtShortcutText}>+{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {mode === 'book' && (
                <>
                  {availability?.enabled === false && (
                    <View style={s.noAvailBanner}>
                      <Text style={s.noAvailText}>⚠️ This partner is not accepting bookings</Text>
                    </View>
                  )}
                  {availability?.enabled && availability.maxRooms - availability.bookedRooms <= 0 && (
                    <View style={s.noAvailBanner}>
                      <Text style={s.noAvailText}>🚫 Sold out — no rooms available</Text>
                    </View>
                  )}
                  {availability?.enabled && availability.maxRooms - availability.bookedRooms > 0 && (
                    <View style={s.availBanner}>
                      <Text style={s.availText}>✅ {availability.maxRooms - availability.bookedRooms} room{availability.maxRooms - availability.bookedRooms > 1 ? 's' : ''} available · {availability.pricePerNight} tokens/night</Text>
                    </View>
                  )}
                  {/* Check-in */}
                  <Text style={s.amtLabel}>Check-in</Text>
                  <View style={s.datePicker}>
                    <TouchableOpacity style={s.dateArrow} onPress={() => setCheckIn(d => addDays(d, -1))}>
                      <Text style={s.dateArrowText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={s.dateLabel}>{formatDateLabel(checkIn)}</Text>
                    <TouchableOpacity style={s.dateArrow} onPress={() => setCheckIn(d => addDays(d, 1))}>
                      <Text style={s.dateArrowText}>›</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Check-out */}
                  <Text style={s.amtLabel}>Check-out</Text>
                  <View style={s.datePicker}>
                    <TouchableOpacity style={s.dateArrow} onPress={() => setCheckOut(d => { const min = addDays(checkIn, 1); const next = addDays(d, -1); return next <= checkIn ? min : next; })}>
                      <Text style={s.dateArrowText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={s.dateLabel}>{formatDateLabel(checkOut)}</Text>
                    <TouchableOpacity style={s.dateArrow} onPress={() => setCheckOut(d => addDays(d, 1))}>
                      <Text style={s.dateArrowText}>›</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Summary */}
                  <View style={s.bookSummary}>
                    <Text style={s.bookSummaryText}>
                      {nightsBetween(checkIn, checkOut)} night{nightsBetween(checkIn, checkOut) > 1 ? 's' : ''}
                    </Text>
                    <Text style={s.bookSummaryTotal}>
                      {nightsBetween(checkIn, checkOut) * (availability?.pricePerNight ?? 0)} 🪙
                    </Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[s.confirmBtn, loading && { opacity: 0.5 }]}
                onPress={mode === 'book' ? handleBook : handleAction}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={s.confirmBtnText}>
                  {loading ? 'Processing...' : mode === 'pay' ? 'Confirm Payment' : mode === 'redeem' ? 'Confirm Redemption' : 'Book Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

// ─── dark success styles ──────────────────────────────────────────────────────
const dark = StyleSheet.create({
  successBg: { flex: 1, backgroundColor: '#0D0D0D' },
  successContent: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 20, paddingBottom: 60, gap: 10 },
  checkCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 3, borderColor: 'rgba(163,230,53,0.2)',
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: '#6B7280' },
  receipt: { width: '100%', backgroundColor: '#1A1A1A', borderRadius: 24, padding: 20, marginTop: 8 },
  receiptPartner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2A2A2A', borderRadius: 14, padding: 12, marginBottom: 14 },
  partnerDot: { width: 10, height: 10, borderRadius: 5 },
  partnerName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  dash: { borderBottomWidth: 1, borderBottomColor: '#3A3A3A', borderStyle: 'dashed', marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: '#6B7280' },
  rowVal: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  rowValSm: { fontSize: 12, color: '#4B5563', maxWidth: '55%', textAlign: 'right' },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  doneBtn: {
    width: '100%', backgroundColor: '#A3E635', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: '#111827' },
});

// ─── main styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4, alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  stayBanner: {
    marginHorizontal: 20, marginTop: 12, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
  },
  stayBannerActive: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  stayBannerInactive: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  stayBannerText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  stayBannerTextActive: { color: '#16A34A' },
  stayBannerTextInactive: { color: '#DC2626' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#E5E7EB', borderRadius: 999, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFFFFF' },

  tabContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 12 },

  viewfinder: {
    height: 260, borderRadius: 24, backgroundColor: '#E5E7EB',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  vfInner: { alignItems: 'center', gap: 12 },
  vfText: { fontSize: 13, color: '#6B7280' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#111827', borderWidth: 2.5 },
  cornerTL: { top: 16, left: 16, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 16, right: 16, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 16, left: 16, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 16, right: 16, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: {
    position: 'absolute', left: 16, right: 16, height: 2,
    backgroundColor: '#A3E635', top: 16,
    shadowColor: '#A3E635', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },

  scanNowBtn: {
    backgroundColor: '#A3E635', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  scanNowBtnActive: { backgroundColor: '#EF4444' },
  scanNowText: { fontSize: 15, fontWeight: '800', color: '#111827' },

  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    marginHorizontal: 20, marginTop: 10,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  chartHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: 12, fontWeight: '700', color: '#111827' },
  chartSub: { fontSize: 11, color: '#6B7280' },

  utilRow: { flexDirection: 'row', gap: 12 },
  utilBtn: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  utilLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  partnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  partnerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  partnerMid: { flex: 1 },
  partnerName2: { fontSize: 14, fontWeight: '600', color: '#111827' },
  partnerType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pricePill: { backgroundColor: '#F0FDF4', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginRight: 4 },
  pricePillText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modal: {
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 14,
  },
  modalPartner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalPartnerIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalPartnerName: { flex: 1, fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  modalModeRow: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 999, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#FFFFFF' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeBtnTextActive: { color: '#111827' },

  amtLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500', letterSpacing: 0.3 },
  amtInput: {
    fontSize: 52, fontWeight: '800', color: '#FFFFFF', textAlign: 'center',
    backgroundColor: '#2A2A2A', borderRadius: 16, paddingVertical: 14,
  },
  amtBtns: { flexDirection: 'row', gap: 8 },
  amtShortcut: {
    flex: 1, backgroundColor: '#2A2A2A', borderRadius: 12, paddingVertical: 10,
    alignItems: 'center',
  },
  amtShortcutText: { fontSize: 13, fontWeight: '700', color: '#A3E635' },
  confirmBtn: {
    backgroundColor: '#A3E635', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#111827' },

  // date picker
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2A2A2A', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4,
  },
  dateArrow: { paddingHorizontal: 16, paddingVertical: 4 },
  dateArrowText: { fontSize: 24, color: '#A3E635', fontWeight: '600' },
  dateLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1, textAlign: 'center' },

  // availability banners
  noAvailBanner: { backgroundColor: '#3A1515', borderRadius: 12, padding: 12 },
  noAvailText: { fontSize: 13, color: '#F87171', textAlign: 'center' },
  availBanner: { backgroundColor: '#1A2E1A', borderRadius: 12, padding: 12 },
  availText: { fontSize: 13, color: '#86EFAC', textAlign: 'center' },

  // booking summary row
  bookSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  bookSummaryText: { fontSize: 13, color: '#9CA3AF' },
  bookSummaryTotal: { fontSize: 16, fontWeight: '800', color: '#A3E635' },

  // booking confirmation modal
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  confirmSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48, alignItems: 'center', gap: 14,
  },
  confirmTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  confirmSub: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  qrWrap: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  confirmCodePill: {
    backgroundColor: '#84CC16', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8,
  },
  confirmCodeText: { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: 2 },
  confirmDetails: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 8 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmRowLabel: { fontSize: 13, color: '#6B7280' },
  confirmRowVal: { fontSize: 13, fontWeight: '600', color: '#111827' },
  confirmRowTotal: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 },
  confirmTotalLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  confirmTotalVal: { fontSize: 15, fontWeight: '800', color: '#059669' },
  confirmDoneBtn: {
    width: '100%', backgroundColor: '#111827', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  confirmDoneBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});
