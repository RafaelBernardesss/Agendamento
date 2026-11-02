import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, fonts } from '../theme';
import { Button, GradientBackground, logoSource } from './ui';
import { KeyboardAwareScroll } from './KeyboardAwareScroll';

export function TopBar() {
  const insets = useSafeAreaInsets();
  const { openMenu } = useApp();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      <Image source={logoSource} style={{ width: 104, height: 44 }} resizeMode="contain" />
      <Pressable onPress={openMenu} hitSlop={12} accessibilityRole="button" accessibilityLabel="Abrir menu">
        <Feather name="menu" size={28} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  back = true,
  onBack,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderRow}>
        {back ? (
          <Pressable
            onPress={() => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={{ paddingTop: 6 }}
          >
            <Feather name="chevron-left" size={26} color={colors.muted} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.rule}>
        <View style={styles.rulePill} />
      </View>
    </View>
  );
}

export function Screen({
  title,
  subtitle,
  back,
  onBack,
  children,
  footer,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <TopBar />
      <GradientBackground>
        <PageHeader title={title} subtitle={subtitle} back={back} onBack={onBack} />
        {scroll ? (
          <KeyboardAwareScroll
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </KeyboardAwareScroll>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>{children}</View>
        )}
        {footer}
      </GradientBackground>
    </View>
  );
}

const MENU_ITEMS: { label: string; icon: React.ComponentProps<typeof Feather>['name']; href: string }[] = [
  { label: 'Home', icon: 'home', href: '/' },
  { label: 'Agendamento', icon: 'calendar', href: '/agendar' },
  { label: 'Notificações', icon: 'bell', href: '/notificacoes' },
  { label: 'Agendamentos', icon: 'clipboard', href: '/agendamentos' },
];

export function SideMenu() {
  const { menuOpen, closeMenu, loggedIn, name, logout } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const width = Math.min(300, Dimensions.get('window').width * 0.8);
  const slide = useRef(new Animated.Value(width)).current;
  const [visible, setVisible] = React.useState(false);

  useEffect(() => {
    if (menuOpen) {
      setVisible(true);
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else if (visible) {
      Animated.timing(slide, { toValue: width, duration: 180, useNativeDriver: true }).start(() => setVisible(false));
    }
  }, [menuOpen]);

  const go = (href: string) => {
    closeMenu();
    router.navigate(href as never);
  };

  const confirmLogout = () => {
    Alert.alert('Sair da conta?', 'Você precisará informar nome e telefone de novo para agendar.', [
      { text: 'Ficar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          closeMenu();
          await logout();
          router.navigate('/');
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeMenu} statusBarTranslucent>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Pressable style={styles.backdrop} onPress={closeMenu} accessibilityLabel="Fechar menu" />
        <Animated.View style={[styles.panel, { width, transform: [{ translateX: slide }], paddingTop: insets.top }]}>
          <View style={styles.panelHead}>
            <View style={styles.panelHeadRow}>
              <Text style={styles.menuLabel}>MENU</Text>
              <Pressable onPress={closeMenu} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar menu">
                <Feather name="x" size={24} color={colors.text} />
              </Pressable>
            </View>
            <Image source={logoSource} style={{ width: 200, height: 82, alignSelf: 'center' }} resizeMode="contain" />
          </View>
          <ScrollView style={{ flex: 1 }}>
            {MENU_ITEMS.map((it) => (
              <Pressable
                key={it.label}
                onPress={() => go(it.href)}
                style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#FFF3F7' }]}
                accessibilityRole="button"
              >
                <Feather name={it.icon} size={22} color={colors.pink} />
                <Text style={styles.menuItemText}>{it.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={[styles.panelFoot, { paddingBottom: insets.bottom + 16 }]}>
            {loggedIn ? (
              <View style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userHello}>Olá, {name.trim().split(' ')[0]}</Text>
                </View>
                <Pressable onPress={confirmLogout} hitSlop={8} accessibilityRole="button" style={styles.logoutBtn}>
                  <Feather name="log-out" size={16} color={colors.pinkDark} />
                  <Text style={styles.logoutText}>Sair</Text>
                </Pressable>
              </View>
            ) : (
              <Button title="Entrar" variant="gradient" small onPress={() => go('/login')} style={{ marginBottom: 12 }} />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  pageHeader: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10 },
  pageHeaderRow: { flexDirection: 'row', gap: 10 },
  pageTitle: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },
  pageSubtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, marginTop: 2 },
  rule: { height: 1, backgroundColor: 'rgba(224,120,156,0.18)', marginTop: 14, alignItems: 'center' },
  rulePill: { width: 26, height: 5, borderRadius: 3, backgroundColor: colors.pink, marginTop: -2, alignSelf: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(30,15,25,0.45)' },
  panel: { backgroundColor: '#FFFFFF', height: '100%' },
  panelHead: { backgroundColor: '#FFF3F8', paddingHorizontal: 24, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#F3E4EB' },
  panelHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  menuLabel: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 1.5, color: colors.muted },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 24, paddingVertical: 17 },
  menuItemText: { fontFamily: fonts.body, fontSize: 17, color: colors.text },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  userHello: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.pinkSoft },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.pinkDark },
  panelFoot: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3E4EB' },
});
