import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Chrome';
import { Button, Card, IconBubble, LogoCard } from '../../src/components/ui';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_DISPLAY, WHATSAPP_URL } from '../../src/lib/links';
import { colors, fonts } from '../../src/theme';

export default function Contato() {
  const router = useRouter();
  return (
    <Screen title="Contato" subtitle="Entre em contato conosco">
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <LogoCard width={200} />
        <Text style={styles.lead}>Ficou com alguma dúvida? Entre em contato!</Text>
      </View>

      <View style={{ gap: 12, marginTop: 8 }}>
        <Card style={styles.row}>
          <IconBubble name="message-circle" />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>WhatsApp</Text>
            <Text style={styles.value}>{WHATSAPP_DISPLAY}</Text>
          </View>
          <Button title="Conversar" small onPress={() => Linking.openURL(WHATSAPP_URL)} />
        </Card>

        <Card style={styles.row}>
          <IconBubble name="instagram" />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Instagram</Text>
            <Text style={styles.value}>{INSTAGRAM_HANDLE}</Text>
          </View>
          <Button title="Visitar" small onPress={() => Linking.openURL(INSTAGRAM_URL)} />
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Feather name="clock" size={18} color={colors.pink} />
            <Text style={styles.cardTitle}>Atendimento</Text>
          </View>
          <Text style={styles.hours}>Segunda a Sexta: 07:00 – 18:00</Text>
          <Text style={styles.hours}>Sábado: 07:00 – 12:00</Text>
          <Text style={styles.hours}>Domingo: Fechado</Text>
        </Card>

        <Button
          title="Fazer Agendamento Online"
          onPress={() => router.navigate('/agendar')}
          style={{ marginTop: 6 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, marginVertical: 18, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  label: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  value: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, marginTop: 1 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  hours: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, lineHeight: 26 },
});
