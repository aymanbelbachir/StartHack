import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Share, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';
import { generateHotelKeyPair, signProof, generateProofMD } from '@/lib/voucher';
import type { ReservationData } from '@/lib/voucher';
import Svg, { Path } from 'react-native-svg';

const DAY_MS = 86_400_000;

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function nightsBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY_MS));
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d: Date) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

const PlusIcon  = () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M12 5v14M5 12h14" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" /></Svg>;
const MinusIcon = () => <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M5 12h14" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" /></Svg>;

export default function VoucherScreen() {
  const [partnerId,   setPartnerId]   = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [hasKey,      setHasKey]      = useState(false);
  const [pubB64,      setPubB64]      = useState('');
  const [generating,  setGenerating]  = useState(false);

  // form
  const [guestName, setGuestName] = useState('');
  const [chambre,   setChambre]   = useState('101');
  const [checkIn,   setCheckIn]   = useState(() => addDays(new Date(), 1));
  const [checkOut,  setCheckOut]  = useState(() => addDays(new Date(), 3));
  const [tokens,    setTokens]    = useState(50);
  const [montant,   setMontant]   = useState(200);

  // result
  const [voucher,   setVoucher]   = useState<string | null>(null);
  const [proofMD,   setProofMD]   = useState<string | null>(null);

  const nights = nightsBetween(checkIn, checkOut);

  // ── load partner data + key ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [id, name, priv, pub] = await Promise.all([
        AsyncStorage.getItem('partnerId'),
        AsyncStorage.getItem('partnerName'),
        AsyncStorage.getItem('hotel_private_key'),
        AsyncStorage.getItem('hotel_public_key'),
      ]);
      setPartnerId(id ?? '');
      setPartnerName(name ?? '');
      if (priv && pub) { setHasKey(true); setPubB64(pub); }
    })();
  }, []);

  // ── generate key pair (first time) ───────────────────────────────────────
  const handleGenerateKeys = async () => {
    setGenerating(true);
    try {
      const { privJwk, pubB64: pub } = await generateHotelKeyPair();
      await AsyncStorage.setItem('hotel_private_key', JSON.stringify(privJwk));
      await AsyncStorage.setItem('hotel_public_key', pub);
      // Register public key on Firestore (convention with Jungfrau Park server)
      if (FIREBASE_CONFIGURED && db && partnerId) {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'hotels', partnerId), { pubB64: pub, name: partnerName }, { merge: true });
      }
      setPubB64(pub);
      setHasKey(true);
      Alert.alert('Clé générée ✅', 'Votre clé publique a été enregistrée sur le serveur Jungfrau Park.');
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Génération échouée');
    } finally {
      setGenerating(false);
    }
  };

  // ── generate voucher ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!guestName.trim()) { Alert.alert('Champ manquant', 'Entrez le nom du client'); return; }
    const privRaw = await AsyncStorage.getItem('hotel_private_key');
    if (!privRaw) { Alert.alert('Erreur', 'Clé privée introuvable'); return; }
    setGenerating(true);
    try {
      const privJwk: JsonWebKey = JSON.parse(privRaw);
      const data: ReservationData = {
        client:  guestName.trim(),
        hotel:   partnerName,
        hotelId: partnerId,
        chambre,
        checkIn:  toISO(checkIn),
        checkOut: toISO(checkOut),
        nights,
        montant,
        devise: 'CHF',
        tokens,
        exp: Date.now() + 30 * DAY_MS,
      };
      const v = await signProof(data, privJwk);
      setVoucher(v);
      setProofMD(generateProofMD(data, v));
    } catch (e: any) {
      Alert.alert('Erreur signature', e.message ?? 'Échec');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!proofMD) return;
    await Share.share({ message: proofMD, title: 'Jungfrau Pass — Preuve de Paiement' });
  };

  // ── if no key yet ─────────────────────────────────────────────────────────
  if (!hasKey) {
    return (
      <View style={s.center}>
        <Text style={s.setupTitle}>Convention initiale</Text>
        <Text style={s.setupSub}>
          Générez votre paire de clés ECDSA P-256.{'\n'}
          La clé publique sera partagée avec le serveur Jungfrau Park.{'\n'}
          La clé privée reste sur cet appareil.
        </Text>
        <TouchableOpacity style={s.setupBtn} onPress={handleGenerateKeys} disabled={generating} activeOpacity={0.85}>
          <Text style={s.setupBtnText}>{generating ? 'Génération…' : 'Générer ma paire de clés'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Émettre un bon de réservation</Text>
          <Text style={s.headerSub}>Signé avec votre clé privée · vérifiable hors-ligne</Text>
        </View>

        {/* public key info */}
        <View style={s.keyCard}>
          <Text style={s.keyLabel}>🔑 Clé publique enregistrée</Text>
          <Text style={s.keyVal} numberOfLines={2}>{pubB64.slice(0, 48)}…</Text>
          <Text style={s.keySub}>Convention active avec Jungfrau Park ✅</Text>
        </View>

        {/* form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Détails du séjour</Text>

          <View style={s.field}>
            <Text style={s.label}>Nom du client</Text>
            <TextInput
              style={s.input} value={guestName} onChangeText={setGuestName}
              placeholder="Alice Dupont" placeholderTextColor="#9CA3AF" autoCapitalize="words"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Numéro de chambre</Text>
            <TextInput
              style={s.input} value={chambre} onChangeText={setChambre}
              placeholder="101" placeholderTextColor="#9CA3AF" keyboardType="numeric"
            />
          </View>

          {/* Check-in */}
          <View style={s.field}>
            <Text style={s.label}>Check-in</Text>
            <View style={s.datePicker}>
              <TouchableOpacity style={s.dateArrow} onPress={() => setCheckIn(d => addDays(d, -1))}><MinusIcon /></TouchableOpacity>
              <Text style={s.dateVal}>{fmtDate(checkIn)}</Text>
              <TouchableOpacity style={s.dateArrow} onPress={() => setCheckIn(d => addDays(d, 1))}><PlusIcon /></TouchableOpacity>
            </View>
          </View>

          {/* Check-out */}
          <View style={s.field}>
            <Text style={s.label}>Check-out</Text>
            <View style={s.datePicker}>
              <TouchableOpacity style={s.dateArrow} onPress={() => setCheckOut(d => { const min = addDays(checkIn, 1); const n = addDays(d, -1); return n <= checkIn ? min : n; })}><MinusIcon /></TouchableOpacity>
              <Text style={s.dateVal}>{fmtDate(checkOut)}</Text>
              <TouchableOpacity style={s.dateArrow} onPress={() => setCheckOut(d => addDays(d, 1))}><PlusIcon /></TouchableOpacity>
            </View>
          </View>

          {/* Montant CHF */}
          <View style={s.field}>
            <Text style={s.label}>Montant réglé (CHF)</Text>
            <View style={s.datePicker}>
              <TouchableOpacity style={s.dateArrow} onPress={() => setMontant(m => Math.max(50, m - 50))}><MinusIcon /></TouchableOpacity>
              <Text style={s.dateVal}>{montant} CHF</Text>
              <TouchableOpacity style={s.dateArrow} onPress={() => setMontant(m => m + 50)}><PlusIcon /></TouchableOpacity>
            </View>
          </View>

          {/* Tokens */}
          <View style={s.field}>
            <Text style={s.label}>Tokens Jungfrau Pass accordés</Text>
            <View style={s.datePicker}>
              <TouchableOpacity style={s.dateArrow} onPress={() => setTokens(t => Math.max(1, t - 10))}><MinusIcon /></TouchableOpacity>
              <Text style={s.dateVal}>{tokens} 🪙</Text>
              <TouchableOpacity style={s.dateArrow} onPress={() => setTokens(t => t + 10)}><PlusIcon /></TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View style={s.summary}>
            <Text style={s.summaryText}>{nights} nuit{nights > 1 ? 's' : ''} · chambre {chambre} · {montant} CHF</Text>
            <Text style={s.summaryText}>{guestName || '—'} · {tokens} tokens 🪙</Text>
          </View>

          <TouchableOpacity style={[s.genBtn, generating && { opacity: 0.5 }]} onPress={handleGenerate} disabled={generating} activeOpacity={0.85}>
            <Text style={s.genBtnText}>{generating ? 'Signature en cours…' : 'Signer et générer le bon'}</Text>
          </TouchableOpacity>
        </View>

        {/* Voucher result */}
        {voucher && proofMD && (
          <View style={s.voucherCard}>
            <Text style={s.voucherTitle}>✅ Preuve de paiement signée</Text>
            <Text style={s.voucherSub}>QR code à scanner · ou partager le .md à l'invité</Text>

            <View style={s.qrBox}>
              <QRCode value={voucher} size={220} color="#111827" backgroundColor="#FFFFFF" />
            </View>

            <View style={s.voucherInfo}>
              <Row label="Client"   val={guestName} />
              <Row label="Hôtel"    val={partnerName} />
              <Row label="Check-in" val={toISO(checkIn)} />
              <Row label="Check-out" val={toISO(checkOut)} />
              <Row label="Nuits"    val={String(nights)} />
              <Row label="Montant"  val={`${montant} CHF`} />
              <Row label="Tokens"   val={`${tokens} 🪙`} />
              <Row label="Expire"   val="dans 30 jours" />
            </View>

            <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Text style={s.shareBtnText}>Partager la facture .md</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.resetBtn} onPress={() => { setVoucher(null); setProofMD(null); setGuestName(''); }} activeOpacity={0.8}>
              <Text style={s.resetBtnText}>Nouveau bon</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoVal}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content:   { paddingHorizontal: 20, paddingBottom: 120, gap: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20, backgroundColor: '#F9FAFB' },
  setupTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  setupSub:   { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  setupBtn:   { backgroundColor: '#111827', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center' },
  setupBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  header: { paddingTop: 56, paddingBottom: 4, gap: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  headerSub:   { fontSize: 13, color: '#6B7280' },

  keyCard: {
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 14, gap: 4,
    borderWidth: 1.5, borderColor: '#BBF7D0',
  },
  keyLabel: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  keyVal:   { fontSize: 11, color: '#4B5563', fontFamily: 'monospace' ?? undefined },
  keySub:   { fontSize: 12, color: '#16A34A', fontWeight: '600', marginTop: 4 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },

  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.3 },
  input: {
    height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB',
  },
  datePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 },
  dateArrow:  { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  dateVal:    { fontSize: 15, fontWeight: '700', color: '#111827' },

  summary: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 4 },
  summaryText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  genBtn: { backgroundColor: '#111827', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  genBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  voucherCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  voucherTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  voucherSub:   { fontSize: 13, color: '#6B7280' },
  qrBox: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB' },
  voucherInfo: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: '#9CA3AF' },
  infoVal:   { fontSize: 13, fontWeight: '700', color: '#111827' },
  shareBtn: { width: '100%', backgroundColor: '#84CC16', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { fontSize: 15, fontWeight: '800', color: '#111827' },
  resetBtn: { paddingVertical: 8 },
  resetBtnText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
});
