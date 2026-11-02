import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../../../src/components/Chrome';
import { ConfigCalendar, currentCursor, HoursEditor, monthKeyOf, useAdminErrorHandler } from '../../../src/components/ConfigUI';
import { Button, Card } from '../../../src/components/ui';
import { api, ConfigMonth, WorkDay } from '../../../src/lib/api';
import { validateHours } from '../../../src/lib/format';
import { colors, fonts } from '../../../src/theme';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function summary(d: WorkDay): string {
  if (!d.works) return 'Não trabalha';
  const lunch = d.lunchStart && d.lunchEnd ? ` · almoço ${d.lunchStart}–${d.lunchEnd}` : '';
  return `${d.open} – ${d.close}${lunch}`;
}

export default function Datas() {
  const router = useRouter();
  const onError = useAdminErrorHandler();
  const [cursor, setCursor] = useState(currentCursor);
  const [month, setMonth] = useState<ConfigMonth | null>(null);
  const monthKey = monthKeyOf(cursor);

  const loadMonth = useCallback(async () => {
    setMonth(null);
    try {
      setMonth(await api.admin.configMonth(monthKey));
    } catch (e) {
      setMonth({ month: monthKey, closed: [], custom: [], limits: {} });
      onError(e, 'Não foi possível carregar o calendário');
    }
  }, [monthKey, onError]);

  useFocusEffect(
    useCallback(() => {
      loadMonth();
    }, [loadMonth])
  );

  return (
    <Screen title="Datas" subtitle="Dias e horários de trabalho" onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin/configuracao'))}>
      <Text style={styles.hint}>Toque em um dia para fechar a agenda dele ou mudar o horário só daquele dia.</Text>

      <View style={{ marginTop: 12 }}>
        <ConfigCalendar
          cursor={cursor}
          setCursor={setCursor}
          onSelect={(date) => router.push({ pathname: '/admin/configuracao/dia', params: { date } } as never)}
          closed={month?.closed || []}
          custom={month?.custom || []}
          loading={!month}
          legend={[
            { color: '#F4EEF0', label: 'Fechado' },
            { color: colors.pink, label: 'Horário especial', small: true },
          ]}
        />
      </View>

      <WeeklyHours onError={onError} onSaved={loadMonth} />
    </Screen>
  );
}

function WeeklyHours({ onError, onSaved }: { onError: (e: unknown, title: string) => void; onSaved: () => void }) {
  const [days, setDays] = useState<WorkDay[] | null>(null);
  const [saved, setSaved] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.admin.workHours();
      setDays(list);
      setSaved(JSON.stringify(list));
    } catch (e) {
      setDays([]);
      onError(e, 'Não foi possível carregar o horário fixo');
    }
  }, [onError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = (weekday: number, patch: Partial<WorkDay>) =>
    setDays((cur) => (cur || []).map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));

  const dirty = !!days && days.length === 7 && JSON.stringify(days) !== saved;

  const save = async () => {
    if (!days) return;
    for (const d of days) {
      const err = d.works ? validateHours(d) : null;
      if (err) {
        setOpen(d.weekday);
        Alert.alert(WEEKDAY_NAMES[d.weekday], err);
        return;
      }
    }
    setSaving(true);
    try {
      const list = await api.admin.saveWorkHours(days);
      setDays(list);
      setSaved(JSON.stringify(list));
      onSaved();
      Alert.alert('Horário fixo salvo', 'As clientes já veem os novos horários ao agendar.');
    } catch (e) {
      onError(e, 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ marginTop: 26 }}>
      <Text style={styles.sectionTitle}>Horário de trabalho fixo</Text>
      <Text style={styles.hint}>Entrada, almoço e saída de cada dia da semana. Para mudar só um dia, toque nele no calendário.</Text>

      {days === null ? <ActivityIndicator color={colors.pink} style={{ marginTop: 20 }} /> : null}

      <View style={{ gap: 10, marginTop: 12 }}>
        {(days || [])
          .slice()
          .sort((a, b) => WEEK_ORDER.indexOf(a.weekday) - WEEK_ORDER.indexOf(b.weekday))
          .map((d) => {
            const expanded = open === d.weekday && d.works;
            return (
              <Card key={d.weekday} style={{ paddingVertical: 12 }}>
                <View style={styles.dayRow}>
                  <Pressable
                    style={{ flex: 1 }}
                    disabled={!d.works}
                    onPress={() => setOpen(expanded ? null : d.weekday)}
                    accessibilityRole="button"
                    accessibilityLabel={`${WEEKDAY_NAMES[d.weekday]}: ${summary(d)}`}
                  >
                    <Text style={styles.dayName}>{WEEKDAY_NAMES[d.weekday]}</Text>
                    <Text style={styles.daySummary}>{summary(d)}</Text>
                  </Pressable>
                  {d.works ? (
                    <Pressable onPress={() => setOpen(expanded ? null : d.weekday)} hitSlop={10} style={{ paddingHorizontal: 8 }} accessibilityLabel="Editar horário">
                      <Feather name={expanded ? 'chevron-up' : 'edit-2'} size={18} color={colors.muted} />
                    </Pressable>
                  ) : null}
                  <Switch
                    value={d.works}
                    onValueChange={(v) => {
                      update(d.weekday, { works: v });
                      setOpen(v ? d.weekday : null);
                    }}
                    trackColor={{ true: colors.pink, false: '#E5DDE1' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {expanded ? (
                  <View style={styles.editor}>
                    <HoursEditor
                      value={{ open: d.open, close: d.close, lunchStart: d.lunchStart, lunchEnd: d.lunchEnd }}
                      onChange={(h) => update(d.weekday, h)}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
      </View>

      {days && days.length === 7 ? (
        <Button
          title={dirty ? 'Salvar horário fixo' : 'Horário fixo salvo'}
          variant="gradient"
          disabled={!dirty}
          loading={saving}
          onPress={save}
          style={{ marginTop: 16 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19, marginTop: 8 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  dayRow: { flexDirection: 'row', alignItems: 'center' },
  dayName: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text },
  daySummary: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  editor: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.pinkBorder },
});
