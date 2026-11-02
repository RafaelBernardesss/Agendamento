import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Chrome';
import { Button, Card } from '../../src/components/ui';
import { api, FALLBACK_SERVICES, InfoHours, isDepilacao, Service } from '../../src/lib/api';
import { formatDuration } from '../../src/lib/format';
import { ADDRESS, PRIVACY_URL } from '../../src/lib/links';
import { colors, fonts } from '../../src/theme';

const FALLBACK_HOURS: InfoHours[] = [
  { label: 'Segunda a Sexta', value: '07:00 – 18:00' },
  { label: 'Sábado', value: '07:00 – 12:00' },
  { label: 'Domingo', value: 'Fechado' },
];

export default function Informacoes() {
  const [services, setServices] = useState<Pick<Service, 'name' | 'durationMinutes'>[]>(FALLBACK_SERVICES.map((name) => ({ name })));
  const [hours, setHours] = useState<InfoHours[]>(FALLBACK_HOURS);

  useEffect(() => {
    api
      .services()
      .then((l) => l.length && setServices(l))
      .catch(() => {});
    api
      .info()
      .then((i) => i.hours && i.hours.length && setHours(i.hours))
      .catch(() => {});
  }, []);

  const openMap = () => {
    const q = encodeURIComponent(ADDRESS);
    Linking.openURL(Platform.OS === 'android' ? `geo:0,0?q=${q}` : `https://maps.apple.com/?q=${q}`).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`)
    );
  };

  return (
    <Screen title="Informações" subtitle="Sobre o Ateliê Bela Donzela">
      <View style={{ gap: 14, marginTop: 8 }}>
        <Card>
          <Title icon="heart" text="Ateliê Bela Donzela" />
          <Text style={styles.body}>
            Estética facial e corporal com atendimento especializado. Agende pelo aplicativo e escolha o melhor horário
            disponível.
          </Text>
        </Card>

        <Card>
          <Title icon="scissors" text="Serviços" />
          {services.filter((s) => !isDepilacao(s.name)).map((s) => (
            <Text key={s.name} style={styles.li}>
              • {s.name}
              {s.durationMinutes ? ` · cerca de ${formatDuration(s.durationMinutes)}` : ''}
            </Text>
          ))}
          {services.some((s) => isDepilacao(s.name)) ? <Text style={styles.li}>• Depilação</Text> : null}
        </Card>

        <Card>
          <Title icon="clock" text="Horários" />
          <Text style={styles.body}>{hours.map((h) => `${h.label}: ${h.value}`).join('\n')}</Text>
        </Card>

        <Card>
          <Title icon="map-pin" text="Localização" />
          <Text style={styles.body}>{ADDRESS}</Text>
          <Button title="Abrir no mapa" variant="outline" small onPress={openMap} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
        </Card>

        <Card>
          <Title icon="shield" text="Privacidade" />
          <Text style={styles.body}>
            Usamos seu nome e telefone apenas para registrar e consultar seus agendamentos.
          </Text>
          {PRIVACY_URL ? (
            <Button
              title="Política de privacidade"
              variant="outline"
              small
              onPress={() => Linking.openURL(PRIVACY_URL)}
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
            />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

function Title({ icon, text }: { icon: React.ComponentProps<typeof Feather>['name']; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Feather name={icon} size={18} color={colors.pink} />
      <Text style={styles.title}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 22, color: colors.muted },
  li: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 24, color: colors.muted },
});
