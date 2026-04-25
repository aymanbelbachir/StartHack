import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path, Circle } from 'react-native-svg';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { parseInvoice, type ParsedInvoice } from '@/lib/parseInvoice';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

const DAY_PACKS = [
  { days: 1, priceCHF: '20.00', label: 'Day Pass' },
  { days: 3, priceCHF: '50.00', label: '3-Day Pass' },
  { days: 7, priceCHF: '100.00', label: 'Week Pass' },
] as const;

// ─── icons ────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#84CC16" />
    <Path d="M8 12l3 3 5-5" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AlertIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#EF4444" />
    <Path d="M12 8v4M12 16h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const FileIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#84CC16" strokeWidth="2" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#84CC16" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// ─── helpers ──────────────────────────────────────────────────────────────────
function hasJungfrauPassLine(invoice: ParsedInvoice): boolean {
  return invoice.lineItems.some(item =>
    item.description.toLowerCase().includes('jungfraupass'),
  );
}

async function saveActivation(data: {
  name?: string;
  hotelCode?: string;
  tokenBalance: number;
  checkIn: string;
  checkOut: string;
  hotel?: string;
  activationType: 'invoice' | 'daypass';
}) {
  const userId = await AsyncStorage.getItem('userId');

  if (FIREBASE_CONFIGURED && db) {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        ...data,
        activatedAt: serverTimestamp(),
      });
    }
  }

  const raw = await AsyncStorage.getItem('wallet_data');
  const wallet = raw ? JSON.parse(raw) : {};
  await AsyncStorage.setItem('wallet_data', JSON.stringify({ ...wallet, ...data }));
}

// ─── screen ───────────────────────────────────────────────────────────────────
export default function ActivateScreen() {
  const [tab, setTab] = useState<'invoice' | 'daypass'>('invoice');

  // invoice tab state
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [invoiceError, setInvoiceError] = useState('');
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // day pass tab state
  const [loadingDays, setLoadingDays] = useState<number | null>(null);

  // ── file picker ──────────────────────────────────────────────────────────
  const handlePickFile = async () => {
    setPicking(true);
    setParsed(null);
    setInvoiceError('');
    setFileName('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setFileName(asset.name ?? 'invoice');

      const isPdf = asset.mimeType === 'application/pdf'
        || (asset.name ?? '').toLowerCase().endsWith('.pdf');

      let content: string;

      if (isPdf) {
        // Send PDF to backend — pdf-parse extracts the text server-side
        const formData = new FormData();
        if ((asset as any).file) {
          formData.append('file', (asset as any).file, asset.name ?? 'invoice.pdf');
        } else {
          formData.append('file', {
            uri: asset.uri,
            name: asset.name ?? 'invoice.pdf',
            type: 'application/pdf',
          } as any);
        }
        const parseRes = await fetch(`${BACKEND_URL}/parse-invoice`, {
          method: 'POST',
          body: formData,
        });
        if (!parseRes.ok) throw new Error('Could not parse PDF on server.');
        const { text, error: parseErr } = await parseRes.json();
        if (parseErr) throw new Error(parseErr);
        content = text;
      } else if ((asset as any).file) {
        // Web + text file: use FileReader
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText((asset as any).file);
        });
      } else {
        // Mobile + text file: use expo-file-system
        content = await FileSystem.readAsStringAsync(asset.uri);
      }

      const inv = parseInvoice(content);
      if (!inv.nights || !inv.checkIn || !inv.checkOut) {
        setInvoiceError('Could not read check-in / check-out dates from this file.');
        return;
      }
      if (!hasJungfrauPassLine(inv)) {
        setInvoiceError('No JungfrauPass line found in this invoice.');
        return;
      }
      setParsed(inv);
    } catch (e: any) {
      setInvoiceError('Could not read this file. Make sure it is a text or markdown file.');
    } finally {
      setPicking(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!parsed) return;
    setConfirming(true);
    try {
      await saveActivation({
        name: parsed.guest || undefined,
        hotelCode: parsed.refNumber || undefined,
        tokenBalance: parsed.nights * 10,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        hotel: parsed.hotel || undefined,
        activationType: 'invoice',
      });
      router.replace('/(guest)');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not activate. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  // ── day pass logic ───────────────────────────────────────────────────────
  const handleBuyDayPass = async (pack: typeof DAY_PACKS[number]) => {
    setLoadingDays(pack.days);
    try {
      const redirectUrl = Linking.createURL('daypass');
      const res = await fetch(`${BACKEND_URL}/create-daypass-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: pack.days, redirectUrl }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Backend error');
      }
      const { url } = await res.json();

      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
      if (result.type !== 'success') return;

      const p = Linking.parse(result.url);
      if (p.queryParams?.status !== 'success') return;

      const sessionId = p.queryParams?.session_id as string;
      const days = Number(p.queryParams?.days);

      const verify = await fetch(`${BACKEND_URL}/verify-session?session_id=${sessionId}`);
      const { paid } = await verify.json();
      if (!paid) { Alert.alert('Payment not confirmed', 'Please try again.'); return; }

      const today = new Date();
      const expiry = new Date();
      expiry.setDate(today.getDate() + days);

      const fmt = (d: Date) =>
        d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      await saveActivation({
        tokenBalance: 0,
        checkIn: fmt(today),
        checkOut: fmt(expiry),
        activationType: 'daypass',
      });

      router.replace('/(guest)');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoadingDays(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activate JungfrauPass</Text>
        <Text style={styles.headerSub}>Prove your stay to unlock the card</Text>
      </View>

      {/* tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'invoice' && styles.tabBtnActive]}
          onPress={() => setTab('invoice')}
        >
          <Text style={[styles.tabText, tab === 'invoice' && styles.tabTextActive]}>I have a booking</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'daypass' && styles.tabBtnActive]}
          onPress={() => setTab('daypass')}
        >
          <Text style={[styles.tabText, tab === 'daypass' && styles.tabTextActive]}>Buy a day pass</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── INVOICE TAB ─────────────────────────────────────────────────── */}
        {tab === 'invoice' && (
          <>
            <Text style={styles.hint}>
              Select the booking confirmation file (.md or .txt) you received from your hotel.
              It must include a JungfrauPass line.
            </Text>

            {/* file picker button */}
            <TouchableOpacity
              style={[styles.pickBtn, picking && styles.pickBtnBusy]}
              onPress={handlePickFile}
              disabled={picking}
              activeOpacity={0.8}
            >
              {picking
                ? <ActivityIndicator color="#84CC16" />
                : <FileIcon />
              }
              <View style={{ flex: 1 }}>
                <Text style={styles.pickBtnLabel}>
                  {fileName || 'Select invoice file'}
                </Text>
                {!fileName && (
                  <Text style={styles.pickBtnSub}>.md · .txt · any text file</Text>
                )}
              </View>
              {!picking && (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path d="M9 18l6-6-6-6" stroke="#84CC16" strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
              )}
            </TouchableOpacity>

            {/* status */}
            {invoiceError ? (
              <View style={styles.statusRow}>
                <AlertIcon />
                <Text style={styles.statusErr}>{invoiceError}</Text>
              </View>
            ) : parsed ? (
              <View style={styles.statusRow}>
                <CheckIcon />
                <Text style={styles.statusOk}>Invoice verified</Text>
              </View>
            ) : null}

            {/* parsed card */}
            {parsed && (
              <View style={styles.card}>
                <Text style={styles.cardHotel}>{parsed.hotel || 'Hotel'}</Text>
                <View style={styles.cardRow}>
                  <CardField label="Guest" value={parsed.guest} />
                  <CardField label="Ref." value={parsed.refNumber} />
                </View>
                <View style={styles.cardRow}>
                  <CardField label="Check-in" value={parsed.checkIn} />
                  <CardField label="Check-out" value={parsed.checkOut} />
                </View>
                <View style={styles.divider} />
                <View style={styles.tokenRow}>
                  <Text style={styles.tokenLabel}>Tokens you'll receive</Text>
                  <Text style={styles.tokenValue}>{parsed.nights * 10} 🪙</Text>
                </View>
                <Text style={styles.tokenSub}>{parsed.nights} nights × 10 tokens/night</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, (!parsed || confirming) && styles.actionBtnDisabled]}
              onPress={handleConfirmInvoice}
              disabled={!parsed || confirming}
              activeOpacity={0.85}
            >
              {confirming
                ? <ActivityIndicator color="#111827" />
                : <Text style={styles.actionBtnText}>Activate Card</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ── DAY PASS TAB ────────────────────────────────────────────────── */}
        {tab === 'daypass' && (
          <>
            <Text style={styles.hint}>
              No hotel booking? Purchase a day pass to access the JungfrauPass and its benefits.
            </Text>

            {DAY_PACKS.map((pack) => {
              const busy = loadingDays === pack.days;
              return (
                <TouchableOpacity
                  key={pack.days}
                  style={styles.packCard}
                  onPress={() => !loadingDays && handleBuyDayPass(pack)}
                  disabled={loadingDays !== null}
                  activeOpacity={0.85}
                >
                  <View style={styles.packLeft}>
                    <Text style={styles.packLabel}>{pack.label}</Text>
                    <Text style={styles.packSub}>{pack.days} day{pack.days > 1 ? 's' : ''} of access</Text>
                  </View>
                  <View style={styles.packRight}>
                    <Text style={styles.packPrice}>CHF {pack.priceCHF}</Text>
                    {busy
                      ? <ActivityIndicator color="#84CC16" style={{ marginTop: 6 }} />
                      : (
                        <View style={styles.buyChip}>
                          <Text style={styles.buyChipText}>Buy</Text>
                        </View>
                      )
                    }
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.testCard}>
              <Text style={styles.testTitle}>Test Mode — No Real Charges</Text>
              <Text style={styles.testText}>
                Card: <Text style={styles.testBold}>4242 4242 4242 4242</Text>
                {'  '}Expiry: <Text style={styles.testBold}>12/34</Text>
                {'  '}CVC: <Text style={styles.testBold}>123</Text>
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.cfLabel}>{label}</Text>
      <Text style={styles.cfValue} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#0D2818', paddingTop: 64, paddingBottom: 24,
    paddingHorizontal: 24, gap: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#0D2818',
    paddingHorizontal: 16, paddingBottom: 16, gap: 8,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabBtnActive: { backgroundColor: '#84CC16' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: '#111827' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  hint: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    borderWidth: 1.5, borderColor: '#84CC16',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  pickBtnBusy: { borderColor: '#E5E7EB' },
  pickBtnLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  pickBtnSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusOk: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  statusErr: { fontSize: 13, color: '#EF4444', flex: 1 },
  card: { backgroundColor: '#0D2818', borderRadius: 20, padding: 20, gap: 12 },
  cardHotel: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  cardRow: { flexDirection: 'row', gap: 16 },
  cfLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, marginBottom: 2 },
  cfValue: { fontSize: 12, color: '#FFFFFF', lineHeight: 17 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  tokenRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tokenLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  tokenValue: { fontSize: 22, fontWeight: '800', color: '#84CC16' },
  tokenSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  actionBtn: {
    backgroundColor: '#84CC16', borderRadius: 16, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#111827' },
  packCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  packLeft: { gap: 3 },
  packLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  packSub: { fontSize: 12, color: '#9CA3AF' },
  packRight: { alignItems: 'flex-end', gap: 6 },
  packPrice: { fontSize: 16, fontWeight: '700', color: '#111827' },
  buyChip: { backgroundColor: '#84CC16', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 7 },
  buyChipText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  testCard: {
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A', gap: 4, marginTop: 4,
  },
  testTitle: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  testText: { fontSize: 12, color: '#78350F', lineHeight: 18 },
  testBold: { fontWeight: '800' },
});
