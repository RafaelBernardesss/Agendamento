import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Chrome';
import { Button, Card, StatusBadge } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { api, ApiError, Appointment, DayAvailability, depilacaoLabel, isDepilacao, Service } from '../../src/lib/api';
import {
  daysInMonth,
  formatDateBR,
  formatDateLong,
  formatDuration,
  joinNames,
  maskPhone,
  MONTHS,
  toDateStr,
  todayStr,
  WEEKDAYS_SHORT,
} from '../../src/lib/format';
import { colors, fonts } from '../../src/theme';

const STEP_TITLES = ['Escolha a Data', 'Escolha os Serviços e Horário'];
const TOTAL_STEPS = STEP_TITLES.length;
const MAX_MONTHS_AHEAD = 6;

export default function Agendar() {
  const router = useRouter();
  const { ready, loggedIn, phone, name, refreshUnread } = useApp();

  const [step, setStep] = useState(1);
  const [date, setDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<Service[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Appointment | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [depilacaoOpen, setDepilacaoOpen] = useState(false);
  const [servicesError, setServicesError] = useState(false);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (ready && !loggedIn) router.replace('/login');
    }, [ready, loggedIn, router])
  );

  const loadServices = useCallback(() => {
    setServicesError(false);
    api
      .services()
      .then(setServices)
      .catch(() => setServicesError(true));
  }, []);

  useEffect(loadServices, [loadServices]);

  const loadSlots = useCallback((d: string, serviceIds: number[]) => {
    setSlots(null);
    setSlotsError(false);
    setTime(null);
    api
      .slots(d, serviceIds)
      .then((r) => setSlots(r.slots))
      .catch(() => setSlotsError(true));
  }, []);

  const idsKey = selected.map((s) => s.id).join(',');
  const totalMinutes = selected.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  useEffect(() => {
    if (step === 2 && date && idsKey) loadSlots(date, idsKey.split(',').map(Number));
  }, [step, date, idsKey, loadSlots]);

  const toggleService = (s: Service) =>
    setSelected((cur) => (cur.some((x) => x.id === s.id) ? cur.filter((x) => x.id !== s.id) : [...cur, s]));
  const isSelected = (s: Service) => selected.some((x) => x.id === s.id);

  const reset = () => {
    setStep(1);
    setDate(null);
    setSelected([]);
    setDepilacaoOpen(false);
    setTime(null);
    setDone(null);
  };

  const depilacaoServices = useMemo(() => services.filter((s) => isDepilacao(s.name)), [services]);
  const depilacaoSelected = selected.some((s) => isDepilacao(s.name));

  const canContinue =
    (step === 1 && !!date) ||
    (step === 2 && selected.length > 0 && !!time);

  const submit = async () => {
    if (!date || selected.length === 0 || !time) return;
    setSubmitting(true);
    try {
      const appt = await api.book({
        clientName: name,
        phone,
        serviceIds: selected.map((s) => s.id),
        date,
        time,
      });
      refreshUnread();
      setDone(appt);
    } catch (e) {
      const err = e as ApiError;
      Alert.alert('Não foi possível agendar', err.message);
      if (err.status === 409) {
        setStep(2);
        if (date && selected.length > 0) loadSlots(date, selected.map((s) => s.id));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onContinue = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else submit();
  };

  if (done) {
    return (
      <Screen title="Agendamento" subtitle="Agendamento confirmado" back={false}>
        <Card style={{ alignItems: 'center', paddingVertical: 28, marginTop: 8 }}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={36} color="#FFF" />
          </View>
          <Text style={styles.doneTitle}>Agendamento realizado</Text>
          <View style={{ marginTop: 8 }}>
            <StatusBadge status="CONFIRMED" />
          </View>
          <Text style={styles.doneService}>{done.service}</Text>
          <Text style={styles.doneWhen}>
            {formatDateLong(done.date)} às {done.time}
          </Text>
          <Text style={styles.doneHint}>Seu agendamento já está confirmado. Você pode acompanhar ou cancelar em “Agendamentos”.</Text>
        </Card>
        <View style={{ gap: 12, marginTop: 20 }}>
          <Button title="Ver meus agendamentos" variant="gradient" onPress={() => { reset(); router.navigate('/agendamentos'); }} />
          <Button title="Fazer outro agendamento" variant="outline" onPress={reset} />
        </View>
      </Screen>
    );
  }

  const footer = (
    <View style={styles.footer}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {step > 1 ? (
          <Button title="Voltar" variant="outline" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />
        ) : null}
        <Button
          title={step === TOTAL_STEPS ? 'Confirmar Agendamento' : 'Continuar'}
          variant="gradient"
          disabled={!canContinue}
          loading={submitting}
          onPress={onContinue}
          style={{ flex: step > 1 ? 2 : 1 }}
        />
      </View>
    </View>
  );

  return (
    <Screen
      title="Agendamento"
      subtitle="Complete as etapas abaixo"
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      footer={footer}
    >
      <View style={styles.progress}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <View key={n} style={[styles.progressSeg, n <= step && { backgroundColor: colors.pink }]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Etapa {step} de {TOTAL_STEPS} · {STEP_TITLES[step - 1]}
      </Text>

      {step === 1 ? (
        <CalendarCard
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setTime(null);
          }}
        />
      ) : null}

      {step === 2 && date ? (
        <View style={{ gap: 18 }}>
          <Card>
            <Text style={styles.blockTitle}>Serviços</Text>
            <Text style={styles.hint}>Escolha quantos serviços quiser.</Text>
            {servicesError ? (
              <Retry text="Não foi possível carregar os serviços." onPress={loadServices} />
            ) : services.length === 0 ? (
              <ActivityIndicator color={colors.pink} style={{ marginVertical: 16 }} />
            ) : (
              <View style={{ gap: 14 }}>
                <View style={styles.wrap}>
                  {services.filter((s) => !isDepilacao(s.name)).map((s) => (
                    <Chip
                      key={s.id}
                      label={s.name}
                      detail={s.durationMinutes ? formatDuration(s.durationMinutes) : undefined}
                      selected={isSelected(s)}
                      onPress={() => toggleService(s)}
                    />
                  ))}
                  {depilacaoServices.length > 0 ? (
                    <Chip
                      label="Depilação"
                      selected={depilacaoOpen || depilacaoSelected}
                      onPress={() => setDepilacaoOpen((open) => !open)}
                    />
                  ) : null}
                </View>
                {depilacaoOpen || depilacaoSelected ? (
                  <View>
                    <Text style={styles.subTitle}>Qual depilação?</Text>
                    <View style={styles.wrap}>
                      {depilacaoServices.map((s) => (
                        <Chip
                          key={s.id}
                          label={depilacaoLabel(s.name)}
                          detail={s.durationMinutes ? formatDuration(s.durationMinutes) : undefined}
                          selected={isSelected(s)}
                          onPress={() => toggleService(s)}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </Card>
          <Card>
            <Text style={styles.blockTitle}>Horário · {formatDateLong(date)}</Text>
            {selected.length === 0 ? (
              <Text style={styles.muted}>Escolha ao menos um serviço para ver os horários disponíveis.</Text>
            ) : slotsError ? (
              <Retry text="Não foi possível carregar os horários." onPress={() => loadSlots(date, selected.map((s) => s.id))} />
            ) : slots === null ? (
              <ActivityIndicator color={colors.pink} style={{ marginVertical: 16 }} />
            ) : slots.length === 0 ? (
              <Text style={styles.muted}>Não há horários para esta combinação de serviços neste dia. Tire algum serviço ou volte e escolha outra data.</Text>
            ) : (
              <View style={styles.wrap}>
                {slots.map((t) => (
                  <Chip key={t} label={t} selected={time === t} onPress={() => setTime(t)} compact />
                ))}
              </View>
            )}
          </Card>
          {selected.length > 0 && time ? (
            <Card>
              <Text style={styles.blockTitle}>Resumo</Text>
              <SummaryRow
                icon="scissors"
                text={totalMinutes ? `${joinNames(selected.map((s) => s.name))} · dura cerca de ${formatDuration(totalMinutes)}` : joinNames(selected.map((s) => s.name))}
              />
              <SummaryRow icon="calendar" text={`${formatDateLong(date)} (${formatDateBR(date)})`} />
              <SummaryRow icon="clock" text={totalMinutes ? `${time} às ${addMinutes(time, totalMinutes)}` : time} />
              <SummaryRow icon="user" text={`${name} · ${maskPhone(phone)}`} />
            </Card>
          ) : null}
        </View>
      ) : null}

    </Screen>
  );
}

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function SummaryRow({ icon, text }: { icon: React.ComponentProps<typeof Feather>['name']; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
      <Feather name={icon} size={18} color={colors.pink} />
      <Text style={{ fontFamily: fonts.body, fontSize: 15, color: colors.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

function Retry({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <Text style={styles.muted}>{text}</Text>
      <Button title="Tentar de novo" variant="outline" small onPress={onPress} />
    </View>
  );
}

function Chip({ label, detail, selected, onPress, compact }: { label: string; detail?: string; selected: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, compact && { minWidth: 76 }, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: '#FFFFFF' }]}>{label}</Text>
      {detail ? <Text style={[styles.chipDetail, selected && { color: '#FFE4EF' }]}>Dura cerca de {detail}</Text> : null}
    </Pressable>
  );
}

function CalendarCard({ selected, onSelect }: { selected: string | null; onSelect: (d: string) => void }) {
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number);
    return { y, m: m - 1 };
  });
  const [days, setDays] = useState<Record<string, DayAvailability> | null>(null);
  const [error, setError] = useState(false);

  const monthKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;
  const [ty, tm] = today.split('-').map(Number);
  const monthsFromNow = (cursor.y - ty) * 12 + (cursor.m - (tm - 1));

  const load = useCallback(() => {
    setDays(null);
    setError(false);
    api
      .availability(monthKey)
      .then((r) => setDays(Object.fromEntries(r.days.map((d) => [d.date, d]))))
      .catch(() => setError(true));
  }, [monthKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
    const total = daysInMonth(cursor.y, cursor.m);
    const list: (number | null)[] = Array(first).fill(null);
    for (let d = 1; d <= total; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < list.length; i += 7) rows.push(list.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const move = (delta: number) => {
    const idx = cursor.y * 12 + cursor.m + delta;
    setCursor({ y: Math.floor(idx / 12), m: idx % 12 });
  };

  return (
    <Card style={{ paddingHorizontal: 12, paddingVertical: 18, borderRadius: 28 }}>
      <View style={styles.calHead}>
        <Pressable
          onPress={() => move(-1)}
          disabled={monthsFromNow <= 0}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          style={{ opacity: monthsFromNow <= 0 ? 0.25 : 1, padding: 6 }}
        >
          <Feather name="chevron-left" size={22} color={colors.muted} />
        </Pressable>
        <Text style={styles.calMonth}>
          {MONTHS[cursor.m]} {cursor.y}
        </Text>
        <Pressable
          onPress={() => move(1)}
          disabled={monthsFromNow >= MAX_MONTHS_AHEAD}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          style={{ opacity: monthsFromNow >= MAX_MONTHS_AHEAD ? 0.25 : 1, padding: 6 }}
        >
          <Feather name="chevron-right" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.calRow}>
        {WEEKDAYS_SHORT.map((w, i) => (
          <Text key={i} style={styles.calWeekday}>
            {w}
          </Text>
        ))}
      </View>

      {error ? (
        <Retry text="Não foi possível carregar o calendário." onPress={load} />
      ) : (
        cells.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((d, ci) => {
              if (d === null) return <View key={ci} style={styles.calCellWrap} />;
              const ds = toDateStr(cursor.y, cursor.m, d);
              const open = !!days && ds >= today && days[ds]?.open === true;
              const isSel = selected === ds;
              return (
                <View key={ci} style={styles.calCellWrap}>
                  <Pressable
                    disabled={!open}
                    onPress={() => onSelect(ds)}
                    accessibilityRole="button"
                    accessibilityLabel={`${d} de ${MONTHS[cursor.m]}${open ? '' : ', indisponível'}`}
                    accessibilityState={{ disabled: !open, selected: isSel }}
                    style={[styles.calCell, !open && styles.calCellOff, isSel && styles.calCellSel]}
                  >
                    <Text style={[styles.calCellText, !open && { color: '#E3CBD3' }, isSel && { color: '#FFF', fontFamily: fonts.bodyBold }]}>
                      {d}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))
      )}

      {!days && !error ? <ActivityIndicator color={colors.pink} style={{ marginTop: 6 }} /> : null}

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#F4EEF0' }]} />
        <Text style={styles.legendText}>Fechado/Lotado</Text>
        <View style={[styles.legendDot, { backgroundColor: colors.pink, marginLeft: 14 }]} />
        <Text style={styles.legendText}>Selecionado</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  subTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.text, marginBottom: 8 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: -6, marginBottom: 12 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 4 },
  progressSeg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  stepLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 8, marginBottom: 14 },
  footer: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3E4EB', paddingHorizontal: 16, paddingVertical: 12 },
  blockTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, marginBottom: 12 },
  muted: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, textAlign: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F7CFDD',
    backgroundColor: '#FFF0F5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.pink, borderColor: colors.pink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#8E2D5A' },
  chipDetail: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 14 },
  calMonth: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  calRow: { flexDirection: 'row' },
  calWeekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted, paddingVertical: 8 },
  calCellWrap: { width: `${100 / 7}%`, padding: 3 },
  calCell: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  calCellOff: { backgroundColor: '#FBF8F9' },
  calCellSel: { backgroundColor: colors.pink },
  calCellText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingHorizontal: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  doneTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  doneService: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.pinkDark, marginTop: 10 },
  doneWhen: { fontFamily: fonts.body, fontSize: 15, color: colors.text, marginTop: 4 },
  doneHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 14, textAlign: 'center', paddingHorizontal: 16 },
});
