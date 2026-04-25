import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Alert, TextInput, ScrollView,
  Animated, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Dimensions, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
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
        <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#0D0D0D" stroke="#A3E635" strokeWidth={2} />
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

// ─── partner data ────────────────────────────────────────────────────────────
const PARTNER_NAMES: Record<string, string> = {
  'partner-jungfraujoch': 'Jungfraujoch Railway',
  'partner-victoria-restaurant': 'Hotel Victoria Restaurant',
  'partner-interlaken-adventure': 'Interlaken Adventure Sports',
  'partner-bakery': 'Grindelwald Bäckerei',
};

const PARTNERS = [
  { id: 'partner-jungfraujoch', name: 'Jungfraujoch Railway', type: 'Transport', color: '#2563EB', imageUrl: 'https://images.unsplash.com/photo-1613989937169-d7030ca9f7ab?w=400&q=80' },
  { id: 'partner-victoria-restaurant', name: 'Hotel Victoria Restaurant', type: 'Restaurant', color: '#DB2777', imageUrl: 'https://images.unsplash.com/photo-1733551629631-47d5923a2a98?w=400&q=80' },
  { id: 'partner-interlaken-adventure', name: 'Interlaken Adventure Sports', type: 'Activity', color: '#0D9488', imageUrl: 'https://images.unsplash.com/photo-1605548109944-9040d0972bf5?w=400&q=80' },
  { id: 'partner-bakery', name: 'Grindelwald Bäckerei', type: 'Food & Drink', color: '#D97706', imageUrl: 'https://images.unsplash.com/photo-1753011767176-7602e5e8619a?w=400&q=80' },
];

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
  const [mode, setMode] = useState<'pay' | 'redeem'>('pay');
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

  // ── spending chart data ──
  const { transactions } = useTransactions(userId);
  const last7 = buildLast7();
  const chartData = aggregateByDay(transactions, last7);
  const weeklySpent = chartData.reduce((s, v) => s + v, 0);

  // animated scan line
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    AsyncStorage.getItem('userId').then(setUserId);
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
    const txId = `tx-${Date.now()}`;
    const tx = {
      id: txId, fromUserId: userId, toPartnerId: partnerId,
      amount: mode === 'pay' ? tokenAmt : 0, pointsAwarded: mode === 'pay' ? 10 : 0,
      type: mode === 'pay' ? 'payment' : 'benefit_redemption', benefitId: null,
      timestamp: new Date().toISOString(), status: 'confirmed', partnerName,
    };
    const existing = JSON.parse((await AsyncStorage.getItem('transactions')) ?? '[]');
    await AsyncStorage.setItem('transactions', JSON.stringify([tx, ...existing]));
    showSuccess({ partnerName, amount: tokenAmt, points: mode === 'pay' ? 10 : 0, txId, timestamp: new Date().toLocaleString(), mode });
  };

  const processFirebaseTransaction = async (userId: string, partnerName: string, tokenAmt: number) => {
    try {
      const { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } = await import('firebase/firestore');
      const userRef = doc(db!, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error('User not found');
      const data = userSnap.data();
      if (mode === 'pay') {
        if (data.tokenBalance < tokenAmt) throw new Error(`Insufficient tokens (balance: ${data.tokenBalance})`);
        await updateDoc(userRef, { tokenBalance: data.tokenBalance - tokenAmt, pointsBalance: (data.pointsBalance ?? 0) + 10 });
      }
      const docRef = await addDoc(collection(db!, 'transactions'), {
        fromUserId: userId, toPartnerId: partnerId,
        amount: mode === 'pay' ? tokenAmt : 0, pointsAwarded: mode === 'pay' ? 10 : 0,
        type: mode === 'pay' ? 'payment' : 'benefit_redemption', benefitId: null,
        timestamp: serverTimestamp(), status: 'confirmed', partnerName,
      });
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
    const partner = PARTNERS.find(p => p.id === data || data.includes(p.id));
    if (partner) {
      handleSelectPartner(partner);
    } else {
      Alert.alert('QR Code scanné', `Contenu : ${data}`, [
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
      Alert.alert('Image sélectionnée', 'Lecture de QR code depuis la galerie bientôt disponible.');
    }
  };

  // ── partner selection ──
  const handleSelectPartner = (p: typeof PARTNERS[0]) => {
    setPartnerId(p.id);
    setSelectedPartner({ id: p.id, name: p.name, color: p.color });
    setAmount('');
    setModalVisible(true);
  };

  const filteredPartners = PARTNERS.filter(p =>
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
      <StatusBar style="light" />
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
                  <Text style={s.vfText}>Appuie sur "Scan" pour ouvrir la caméra</Text>
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
              <Text style={s.scanNowText}>{cameraActive ? 'Arrêter le scan' : 'Scan Now'}</Text>
            </TouchableOpacity>

            {/* utility buttons */}
            <View style={s.utilRow}>
              <TouchableOpacity style={s.utilBtn} onPress={handleGallery} activeOpacity={0.8}>
                <ImgSvg />
                <Text style={s.utilLabel}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.utilBtn} onPress={() => setActiveTab('manual')} activeOpacity={0.8}>
                <CardSvg />
                <Text style={s.utilLabel}>Manuel</Text>
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

            {/* partner list */}
            {filteredPartners.map(p => (
              <TouchableOpacity
                key={p.id}
                style={s.partnerRow}
                onPress={() => handleSelectPartner(p)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: p.imageUrl }} style={s.partnerIcon} resizeMode="cover" />
                <View style={s.partnerMid}>
                  <Text style={s.partnerName2}>{p.name}</Text>
                  <Text style={s.partnerType}>{p.type}</Text>
                </View>
                <ChevRightSvg />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

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
                  source={{ uri: PARTNERS.find(p => p.id === selectedPartner?.id)?.imageUrl }}
                  style={s.modalPartnerIcon}
                  resizeMode="cover"
                />
                <Text style={s.modalPartnerName}>{selectedPartner?.name}</Text>
              </View>

              {/* mode toggle */}
              <View style={s.modalModeRow}>
                {(['pay', 'redeem'] as const).map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.modeBtn, mode === m && s.modeBtnActive]}
                    onPress={() => setMode(m)}
                  >
                    <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                      {m === 'pay' ? 'Pay' : 'Redeem'}
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

              <TouchableOpacity
                style={[s.confirmBtn, loading && { opacity: 0.5 }]}
                onPress={handleAction}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={s.confirmBtnText}>
                  {loading ? 'Processing...' : mode === 'pay' ? 'Confirm Payment' : 'Confirm Redemption'}
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
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 4, alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#1A1A1A', borderRadius: 999, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#111827' },

  tabContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 12 },

  viewfinder: {
    height: 260, borderRadius: 24, backgroundColor: '#1A1A1A',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  vfInner: { alignItems: 'center', gap: 12 },
  vfText: { fontSize: 13, color: '#4B5563' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#FFFFFF', borderWidth: 2.5 },
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
    backgroundColor: '#1A1A1A', borderRadius: 16,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    marginHorizontal: 20, marginTop: 10,
    alignItems: 'center', gap: 8,
  },
  chartHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  chartSub: { fontSize: 11, color: '#6B7280' },

  utilRow: { flexDirection: 'row', gap: 12 },
  utilBtn: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  utilLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1A1A1A', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },

  partnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1A1A1A', borderRadius: 16, padding: 14,
  },
  partnerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  partnerMid: { flex: 1 },
  partnerName2: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  partnerType: { fontSize: 12, color: '#6B7280', marginTop: 2 },

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
});
