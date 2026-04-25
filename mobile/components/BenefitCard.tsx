import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Benefit } from '@/data/benefits';

interface BenefitCardProps {
  benefit: Benefit;
  redeemed?: boolean;
  onRedeem?: () => void;
}

const ICON_BG = ['#14532D', '#92400E', '#1E40AF', '#5B21B6'];

export function BenefitCard({ benefit, redeemed = false, onRedeem }: BenefitCardProps) {
  const isOneTime = benefit.discountType === 'one_time';
  const idx = parseInt(benefit.id.replace('benefit-', '')) - 1;
  const iconBg = ICON_BG[idx % ICON_BG.length] ?? '#14532D';

  return (
    <View style={[styles.card, redeemed && styles.cardUsed]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Text style={styles.emoji}>{benefit.emoji}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={2}>{benefit.title}</Text>
        <Text style={styles.partner}>{benefit.partnerName}</Text>
        <View style={[styles.typeBadge, isOneTime ? styles.badgeAmber : styles.badgeBlue]}>
          <Text style={[styles.typeBadgeText, isOneTime ? styles.textAmber : styles.textBlue]}>
            {isOneTime ? 'One-time' : 'Multi-use'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, redeemed && styles.btnUsed]}
        onPress={!redeemed ? onRedeem : undefined}
        disabled={redeemed}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, redeemed && styles.btnUsedText]}>
          {redeemed ? 'Used' : 'Redeem'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardUsed: { opacity: 0.55 },
  iconBox: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji: { fontSize: 28 },
  middle: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '600', color: '#111827', lineHeight: 19 },
  partner: { fontSize: 12, color: '#9CA3AF' },
  typeBadge: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeAmber: { backgroundColor: '#FEF3C7' },
  badgeBlue: { backgroundColor: '#DBEAFE' },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },
  textAmber: { color: '#92400E' },
  textBlue: { color: '#1D4ED8' },
  btn: { backgroundColor: '#84CC16', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  btnUsed: { backgroundColor: '#F3F4F6' },
  btnText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  btnUsedText: { color: '#9CA3AF' },
});
