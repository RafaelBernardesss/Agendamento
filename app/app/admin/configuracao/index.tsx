import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../src/components/Chrome';
import { Card, IconBubble } from '../../../src/components/ui';
import { colors, fonts } from '../../../src/theme';

const OPTIONS: { title: string; text: string; icon: React.ComponentProps<typeof Feather>['name']; href: string }[] = [
  { title: 'Horários', text: 'Quanto tempo cada serviço leva. A cliente vê essa duração ao agendar.', icon: 'clock', href: '/admin/configuracao/horarios' },
  { title: 'Datas', text: 'Dias em que você não trabalha, horário de entrada, almoço e saída (fixo ou só de um dia).', icon: 'calendar', href: '/admin/configuracao/datas' },
  { title: 'Agendamentos', text: 'Número máximo de agendamentos novos em um dia.', icon: 'users', href: '/admin/configuracao/agendamentos' },
];

export default function Configuracao() {
  const router = useRouter();
  return (
    <Screen title="Configuração" subtitle="Área Administrativa" onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin'))}>
      <View style={{ gap: 14, marginTop: 8 }}>
        {OPTIONS.map((o) => (
          <Pressable key={o.title} onPress={() => router.push(o.href as never)} accessibilityRole="button" accessibilityLabel={o.title}>
            <Card style={styles.row}>
              <IconBubble name={o.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{o.title}</Text>
                <Text style={styles.text}>{o.text}</Text>
              </View>
              <Feather name="chevron-right" size={22} color={colors.muted} />
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  text: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, marginTop: 3, lineHeight: 19 },
});
