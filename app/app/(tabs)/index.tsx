import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, GradientBackground, IconBubble, LogoCard, logoSource } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { api, FALLBACK_SERVICES, isDepilacao } from '../../src/lib/api';
import { ADDRESS, INSTAGRAM_URL, WHATSAPP_URL } from '../../src/lib/links';
import { colors, fonts } from '../../src/theme';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openMenu, unread, loggedIn } = useApp();
  const [services, setServices] = useState<string[]>([...FALLBACK_SERVICES.filter((n) => !isDepilacao(n)), 'Depilação']);

useEffect(() => {
  api
    .services()
    .then((list) => {
      if (!list.length) return;
      const names = list.map((s) => s.name).filter((n) => !isDepilacao(n));
      if (list.some((s) => isDepilacao(s.name))) names.push('Depilação');
      setServices(names);
    })
    .catch(() => {});
}, []);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.topRow, { paddingTop: insets.top + 12 }]}>
          <Pressable
            style={styles.roundBtn}
            onPress={() => router.navigate('/notificacoes')}
            accessibilityRole="button"
            accessibilityLabel="Notificações"
          >
            <Feather name="bell" size={20} color={colors.pinkDark} />
            {unread > 0 ? (
              <View style={styles.dot}>
                <Text style={styles.dotText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={openMenu} accessibilityRole="button" accessibilityLabel="Abrir menu">
            <Feather name="menu" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <LogoCard width={270} />
          <View style={styles.glow} />
          <Text style={styles.welcome}>Bem-vindo ao</Text>
          <Text style={styles.script}>Bela Donzela</Text>
          <Text style={styles.intro}>
            Realize seu agendamento com praticidade e escolha o melhor horário disponível para seu atendimento.
          </Text>
          <Button
            title="Fazer Agendamento"
            variant="gradient"
            icon={<Ionicons name="sparkles-outline" size={20} color="#FFF" />}
            onPress={() => router.navigate(loggedIn ? '/agendar' : '/login')}
            style={{ marginTop: 22, width: 320, maxWidth: '88%' }}
          />
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>

        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <InfoRow icon="star" title="Profissional certificada" text="Atendimento especializado" />
          <InfoRow icon="clock" title="Horários flexíveis" text="Seg–Sex: 8h–17:30h | Sáb: 8h–12h" />
          <InfoRow icon="map-pin" title="Localização" text={ADDRESS} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`)} />
        </View>

        <Text style={styles.sectionTitle}>Nossos Serviços</Text>
        <View style={styles.chips}>
          {services.map((name) => (
            <LinearGradient key={name} colors={['#FFEEF3', '#FDE3EC']} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={2}>
                {name}
              </Text>
            </LinearGradient>
          ))}
        </View>

        <LinearGradient colors={['#FFF1F6', '#FBE4EE']} style={styles.footer}>
          <Image source={logoSource} style={{ width: 130, height: 54 }} resizeMode="contain" />
          <Text style={styles.footerBrand}>ATELIÊ BELA DONZELA</Text>
          <Text style={styles.footerSub}>Estética facial e corporal</Text>
          <View style={styles.footerLinks}>
            <Pressable style={styles.footerLink} onPress={() => Linking.openURL(WHATSAPP_URL)} accessibilityRole="link">
              <Feather name="message-circle" size={16} color={colors.pink} />
              <Text style={styles.footerLinkText}>Conversar</Text>
            </Pressable>
            <View style={{ width: 1, height: 18, backgroundColor: '#F0C7D6' }} />
            <Pressable style={styles.footerLink} onPress={() => Linking.openURL(INSTAGRAM_URL)} accessibilityRole="link">
              <Feather name="instagram" size={16} color={colors.pink} />
              <Text style={styles.footerLinkText}>Instagram</Text>
            </Pressable>
          </View>
          <Text style={styles.copy}>© {new Date().getFullYear()} Ateliê Bela Donzela · Monex</Text>
        </LinearGradient>
      </ScrollView>
    </GradientBackground>
  );
}

function InfoRow({ icon, title, text, onPress }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  text: string;
  onPress?:() => void; }) {
  const content = (
    <Card style={styles.infoRow}>
      <IconBubble name={icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </Card>
  );

   if(!onPress) return content;
  return(
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${title}: ${text}. Abrir no Google Maps`}>
      {content}
    </Pressable>
  );

}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.pinkStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dotText: { color: '#FFF', fontSize: 10, fontFamily: fonts.bodyBold },
  glow: { width: 90, height: 5, borderRadius: 3, backgroundColor: 'rgba(224,120,156,0.45)', marginTop: 10 },
  welcome: { fontFamily: fonts.heading, fontSize: 27, color: colors.text, marginTop: 26 },
  script: { fontFamily: fonts.script, fontSize: 46, color: colors.pink, marginTop: -4 },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 36,
    marginTop: 4,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, marginVertical: 26 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(224,120,156,0.25)' },
  dividerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(224,120,156,0.6)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  infoTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  infoText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 28 },
  chip: {
    width: '47.5%',
    flexGrow: 1,
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F7CFDD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#8E2D5A', textAlign: 'center' },
  footer: { alignItems: 'center', paddingTop: 28, paddingBottom: 30, gap: 4, borderTopWidth: 1, borderTopColor: '#F5D3E0' },
  footerBrand: { fontFamily: fonts.body, fontSize: 13, letterSpacing: 1.6, color: colors.muted, marginTop: 14 },
  footerSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  footerLinkText: { fontFamily: fonts.body, fontSize: 15, color: colors.pink },
  copy: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 14 },
});
