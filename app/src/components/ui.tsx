import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { bgGradient, colors, fonts, radius, shadow } from '../theme';
import { notifyInputFocus } from './KeyboardAwareScroll';

export const logoSource = require('../../assets/logo.png');

export function GradientBackground({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={bgGradient} locations={[0, 0.35, 0.7, 1]} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

export function LogoCard({ width = 230, style }: { width?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.logoCard, { width, height: width * 0.54 }, style]}>
      <Image source={logoSource} style={{ width: width * 0.88, height: width * 0.38 }} resizeMode="contain" />
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  variant?: 'gradient' | 'solid' | 'outline' | 'danger';
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, disabled, loading, icon, variant = 'solid', small, style }: ButtonProps) {
  const inactive = disabled || loading;
  const height = small ? 40 : 54;
  const common = [styles.btnBase, { height, borderRadius: small ? 14 : radius.pill }];

  const content = (color: string) => (
    <>
      {loading ? <ActivityIndicator color={color} /> : icon}
      <Text style={[styles.btnText, { color, fontSize: small ? 14 : 16 }]}>{title}</Text>
    </>
  );

  if (inactive && variant !== 'danger' && variant !== 'outline') {
    return (
      <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} style={[...common, { backgroundColor: colors.disabledBg }, style]}>
        {content(colors.disabledText)}
      </Pressable>
    );
  }

  if (variant === 'gradient') {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}>
        <LinearGradient colors={[colors.pinkStrong, colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={common}>
          {content('#FFFFFF')}
        </LinearGradient>
      </Pressable>
    );
  }

  const palette = {
    solid: { bg: colors.pink, border: colors.pink, fg: '#FFFFFF' },
    outline: { bg: '#FFFFFF', border: colors.pinkBorder, fg: colors.pinkDark },
    danger: { bg: '#FFFFFF', border: '#F1C9C4', fg: colors.danger },
  }[variant];

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        ...common,
        { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, opacity: pressed || inactive ? 0.6 : 1 },
        style,
      ]}
    >
      {content(palette.fg)}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function IconBubble({ name, size = 22 }: { name: React.ComponentProps<typeof Feather>['name']; size?: number }) {
  return (
    <View style={styles.bubble}>
      <Feather name={name} size={size} color={colors.pink} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  round,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title?: string;
  subtitle: string;
  round?: boolean;
}) {
  return (
    <View style={styles.empty}>
      {round ? (
        <View style={styles.emptyRound}>
          <Feather name={icon} size={38} color={colors.muted} />
        </View>
      ) : (
        <Feather name={icon} size={52} color="#C9B6BE" />
      )}
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

type FieldProps = TextInputProps & { label?: string; icon?: React.ComponentProps<typeof Feather>['name'] };

export function Field({ label, icon, style, onFocus, ...rest }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon ? <Feather name={icon} size={18} color={colors.muted} style={{ marginRight: 10 }} /> : null}
        <TextInput
          placeholderTextColor="#A9A0B0"
          style={[styles.input, style]}
          onFocus={(e) => {
            notifyInputFocus();
            onFocus?.(e);
          }}
          {...rest}
        />
      </View>
    </View>
  );
}

export function StatusBadge({ status }: { status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELED' | 'DONE' }) {
  const map = {
    PENDING: { label: 'Pendente', bg: '#FFF4DD', fg: '#A8680B' },
    REJECTED: { label: 'Recusado', bg: '#FBE9E7', fg: colors.danger },
    CONFIRMED: { label: 'Confirmado', bg: '#E8F6EE', fg: colors.success },
    CANCELED: { label: 'Cancelado', bg: '#FBE9E7', fg: colors.danger },
    DONE: { label: 'Concluído', bg: '#EEE9F6', fg: '#6A4FA3' },
  }[status];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{map.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    ...shadow,
  },
  btnBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    gap: 8,
  },
  btnText: { fontFamily: fonts.bodyBold },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    padding: 16,
    ...shadow,
  },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.pinkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 72, gap: 10 },
  emptyRound: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F6F0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontFamily: fonts.body, fontSize: 17, color: colors.muted, textAlign: 'center' },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: '#EDE7EA',
    paddingHorizontal: 14,
    height: 54,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 0 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
