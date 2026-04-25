import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'teal';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style, textStyle }: ButtonProps) {
  const isDark = variant === 'teal';
  const isLight = variant === 'secondary' || variant === 'outline';
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'teal' && styles.dark,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={isDark ? '#FFFFFF' : '#111827'} />
      ) : (
        <Text style={[styles.text, isDark && styles.lightText, isLight && styles.midText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  primary: { backgroundColor: '#84CC16' },
  secondary: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#E5E7EB' },
  dark: { backgroundColor: '#111827' },
  disabled: { opacity: 0.45 },
  text: { color: '#111827', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  lightText: { color: '#FFFFFF' },
  midText: { color: '#374151' },
});
