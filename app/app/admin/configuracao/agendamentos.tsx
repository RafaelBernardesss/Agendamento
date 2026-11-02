import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../src/components/Chrome';
import { ConfigCalendar, currentCursor, monthKeyOf, useAdminErrorHandler } from '../../../src/components/ConfigUI';
import { Button, Card, Field } from '../../../src/components/ui';
import { api, ConfigMonth, DayLimit } from '../../../src/lib/api';
import { formatDateLong } from '../../../src/lib/format';
import { colors, fonts } from '../../../src/theme';

export default function AgendamentosConfig() {
  const router = useRouter();
  const onError = useAdminErrorHandler();
  const [cursor, setCursor] = useState(currentCursor);
  const [month, setMonth] = useState<ConfigMonth | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const monthKey = monthKeyOf(cursor);

  const loadMonth = useCallback(async () => {
    try {
      setMonth(await api.admin.configMonth(monthKey));
    } catch (e) {
      setMonth({ month: monthKey, closed: [], custom: [], limits: {} });
      onError(e, 'Não foi possível carregar o calendário');
    }
  }, [monthKey, onError]);

  useFocusEffect(
    useCallback(() => {
      setMonth(null);
      loadMonth();
    }, [loadMonth])
  );

  return (
    <Screen title="Agendamentos" subtitle="Limite de agendamentos por dia" onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin/configuracao'))}>
      <Text style={styles.hint}>Escolha um dia e defina quantos agendamentos novos ele aceita. Quem já agendou antes continua agendado, sem nenhuma mudança.</Text>

      <View style={{ marginTop: 12 }}>
        <ConfigCalendar
          cursor={cursor}
          setCursor={setCursor}
          selected={date}
          onSelect={setDate}
          closed={month?.closed || []}
          limited={Object.keys(month?.limits || {})}
          loading={!month}
          legend={[
            { color: '#F4EEF0', label: 'Fechado' },
            { color: colors.pink, label: 'Selecionado' },
            { color: colors.pink, label: 'Com limite', small: true },
          ]}
        />
      </View>

      {date ? <LimitEditor key={date} date={date} onError={onError} onChanged={loadMonth} /> : <Text style={[styles.hint, { textAlign: 'center', marginTop: 20 }]}>Toque em um dia do calendário.</Text>}
    </Screen>
  );
}

function LimitEditor({ date, onError, onChanged }: { date: string; onError: (e: unknown, title: string) => void; onChanged: () => void }) {
  const [info, setInfo] = useState<DayLimit | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const apply = (l: DayLimit) => {
    setInfo(l);
    setValue(l.max !== null ? String(l.max) : '');
  };

  useEffect(() => {
    let alive = true;
    api.admin
      .dayLimit(date)
      .then((l) => alive && apply(l))
      .catch((e) => alive && onError(e, 'Não foi possível carregar o dia'));
    return () => {
      alive = false;
    };
  }, [date, onError]);

  const max = Number(value);
  const valid = /^\d+$/.test(value) && max >= 1 && max <= 200;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const l = await api.admin.saveDayLimit(date, max);
      apply(l);
      onChanged();
      Alert.alert('Limite salvo', `Este dia aceita ${max} agendamento(s) novo(s). Quem já estava agendado continua agendado.`);
    } catch (e) {
      onError(e, 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      apply(await api.admin.removeDayLimit(date));
      onChanged();
    } catch (e) {
      onError(e, 'Não foi possível remover');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ marginTop: 18 }}>
      <Text style={styles.title}>{formatDateLong(date)}</Text>

      {!info ? <ActivityIndicator color={colors.pink} style={{ marginVertical: 20 }} /> : null}

      {info ? (
        <>
          {info.max === null ? (
            <Text style={styles.note}>
              Sem limite neste dia. {info.before > 0 ? `Hoje há ${info.before} agendamento(s) marcado(s).` : 'Ainda não há agendamentos.'}
            </Text>
          ) : (
            <View style={styles.stats}>
              <Stat label="Já agendados antes do limite" value={String(info.before)} hint="continuam valendo" />
              <Stat label="Novos agendamentos" value={`${info.used} de ${info.max}`} hint={info.remaining === 0 ? 'limite atingido' : `restam ${info.remaining}`} />
            </View>
          )}

          <View style={{ marginTop: 16 }}>
            <Field
              label="Máximo de agendamentos novos"
              placeholder="Ex.: 5"
              value={value}
              onChangeText={(t) => setValue(t.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              maxLength={3}
              icon="users"
            />
          </View>

          <Button title={info.max === null ? 'Definir limite' : 'Salvar limite'} variant="gradient" disabled={!valid || (info.max !== null && max === info.max)} loading={saving} onPress={save} />
          {info.max !== null ? <Button title="Remover limite" variant="outline" disabled={saving} onPress={remove} style={{ marginTop: 10 }} /> : null}
        </>
      ) : null}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19, marginTop: 8 },
  title: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, textTransform: 'capitalize' },
  note: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20, marginTop: 8 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.pinkSoft, borderRadius: 16, padding: 12 },
  statValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.pinkDark },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.text, marginTop: 4 },
  statHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
});
