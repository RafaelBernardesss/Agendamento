import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../src/components/Chrome';
import { HoursEditor, useAdminErrorHandler } from '../../../src/components/ConfigUI';
import { Button, Card } from '../../../src/components/ui';
import { api, DayConfig, Hours } from '../../../src/lib/api';
import { formatDateLong, isValidDateStr, validateHours } from '../../../src/lib/format';
import { colors, fonts } from '../../../src/theme';

export default function Dia() {
  const router = useRouter();
  const onError = useAdminErrorHandler();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = typeof params.date === 'string' && isValidDateStr(params.date) ? params.date : null;

  const [config, setConfig] = useState<DayConfig | null>(null);
  const [works, setWorks] = useState(true);
  const [hours, setHours] = useState<Hours | null>(null);
  const [saving, setSaving] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/admin/configuracao/datas'));

  const load = useCallback(async () => {
    if (!date) return;
    try {
      const c = await api.admin.dayConfig(date);
      setConfig(c);
      setWorks(c.works);
      setHours(c.hours);
    } catch (e) {
      onError(e, 'Não foi possível carregar o dia');
    }
  }, [date, onError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!date) {
    return (
      <Screen title="Dia" onBack={goBack}>
        <Text style={styles.hint}>Data inválida. Volte e escolha um dia no calendário.</Text>
      </Screen>
    );
  }

  const confirm = async () => {
    if (!hours) return;
    if (works) {
      const err = validateHours(hours);
      if (err) {
        Alert.alert('Horário inválido', err);
        return;
      }
    }
    setSaving(true);
    try {
      await api.admin.saveDayConfig(date, works ? { works: true, hours } : { works: false });
      Alert.alert(
        works ? 'Dia salvo' : 'Dia fechado',
        works
          ? 'O horário deste dia foi atualizado.'
          : config && config.activeAppointments > 0
            ? `O dia foi fechado para novos agendamentos. Os ${config.activeAppointments} já marcados continuam valendo.`
            : 'O dia foi fechado para novos agendamentos.'
      );
      goBack();
    } catch (e) {
      onError(e, 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const useFixed = async () => {
    if (!config || !config.weekly) return;
    setSaving(true);
    try {
      await api.admin.saveDayConfig(date, { works: true, hours: config.weekly });
      goBack();
    } catch (e) {
      onError(e, 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Configurar dia" subtitle={formatDateLong(date)} onBack={goBack}>
      {!config || !hours ? <ActivityIndicator color={colors.pink} style={{ marginTop: 40 }} /> : null}

      {config && hours ? (
        <View style={{ gap: 14, marginTop: 8 }}>
          <Card>
            <Text style={styles.question}>Você vai trabalhar neste dia?</Text>
            <View style={styles.choiceRow}>
              <Choice label="Sim" on={works} onPress={() => setWorks(true)} />
              <Choice label="Não" on={!works} onPress={() => setWorks(false)} />
            </View>
            {!works ? (
              <Text style={styles.note}>
                O dia ficará fechado: ninguém consegue marcar novos horários nele. Basta confirmar.
                {config.activeAppointments > 0
                  ? ` Já existem ${config.activeAppointments} agendamento(s) neste dia e eles continuam valendo.`
                  : ''}
              </Text>
            ) : null}
            {works && !config.weekly && !config.custom ? (
              <Text style={styles.note}>Este dia da semana normalmente é fechado. Defina o horário para abri-lo só nesta data.</Text>
            ) : null}
          </Card>

          {works ? (
            <Card>
              <Text style={styles.question}>Horário deste dia</Text>
              <Text style={[styles.note, { marginTop: 4, marginBottom: 14 }]}>
                A mudança vale só para esta data. Os outros dias seguem o horário fixo.
              </Text>
              <HoursEditor value={hours} onChange={setHours} />
              {config.activeAppointments > 0 ? (
                <Text style={[styles.note, { marginTop: 14 }]}>Quem já agendou neste dia continua agendado, mesmo fora do novo horário.</Text>
              ) : null}
            </Card>
          ) : null}

          <Button title="Confirmar" variant="gradient" loading={saving} onPress={confirm} />
          {works && config.custom && config.weekly ? (
            <Button title="Voltar ao horário fixo" variant="outline" disabled={saving} onPress={useFixed} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      style={[styles.choice, on && styles.choiceOn]}
    >
      <Text style={[styles.choiceText, on && { color: '#FFF' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 16 },
  question: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  choiceRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  choice: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F5', borderWidth: 1, borderColor: '#F7CFDD' },
  choiceOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#8E2D5A' },
  note: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19, marginTop: 12 },
});
