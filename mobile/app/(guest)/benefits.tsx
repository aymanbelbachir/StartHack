import React from 'react';
import { ScrollView, StyleSheet, useColorScheme, Alert } from 'react-native';
import { Colors } from '@/constants/Colors';
import { BenefitCard } from '@/components/BenefitCard';
import { BENEFITS } from '@/data/benefits';

export default function BenefitsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleRedeem = (_benefitId: string) => {
    Alert.alert('Redeem Benefit', 'Go to the Scan tab and scan the partner QR code to redeem this benefit.');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {BENEFITS.map((benefit) => (
        <BenefitCard key={benefit.id} benefit={benefit} onRedeem={() => handleRedeem(benefit.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
});
