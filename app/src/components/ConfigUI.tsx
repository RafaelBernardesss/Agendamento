import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { ApiError, Hours } from '../lib/api';
import { api } from '../lib/api';
import { daysInMonth, minutesToTime, MONTHS, timeToMinutes, toDateStr, todayStr, WEEKDAYS_SHORT } from '../lib/format';
import { colors, fonts, radius } from '../theme';
import { Card } from './ui';

export function useAdminErrorHandler() {
  const router = useRouter();
  return useCallback(
    (e: unknown, title: string) => {
      const err = e as ApiError;
      if (err.status === 401) {
        api.admin.logout().finally(() => router.replace('/admin/login'));
        return;
      }
      Alert.alert(title, err.message || 'Algo deu errado. Tente novamente.');
    },
    [router]
  );
}

const MAX_MONTHS_AHEAD = 12;

export type Cursor = { y: number; m: number };

export function monthKeyOf(c: Cursor): string {
  return `${c.y}-${String(c.m + 1).padStart(2, '0')}`;
}

export function currentCursor(): Cursor {
  const [y, m] = todayStr().split('-').map(Number);
  return { y, m: m - 1 };
}

export type CalendarLegendItem = { color: string; label: string; small?: boolean };

export function ConfigCalendar({
  cursor,
  setCursor,
  selected,
  onSelect,
  closed,
  custom,
  limited,
  loading,
  legend,
}: {
  cursor: Cursor;
  setCursor: (c: Cursor) => void;
  selected?: string | null;
  onSelect: (date: string) => void;
  closed: string[];
  custom?: string[];
  limited?: string[];
  loading?: boolean;
  legend: CalendarLegendItem[];
}) {
  const today = todayStr();
  const [ty, tm] = today.split('-').map(Number);
  const monthsFromNow = (cursor.y - ty) * 12 + (cursor.m - (tm - 1));
  const closedSet = useMemo(() => new Set(closed), [closed]);
  const customSet = useMemo(() => new Set(custom || []), [custom]);
  const limitedSet = useMemo(() => new Set(limited || []), [limited]);

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

      {cells.map((row, ri) => (
        <View key={ri} style={styles.calRow}>
          {row.map((d, ci) => {
            if (d === null) return <View key={ci} style={styles.calCellWrap} />;
            const ds = toDateStr(cursor.y, cursor.m, d);
            const past = ds < today;
            const isSel = selected === ds;
            const isClosed = closedSet.has(ds);
            const isCustom = customSet.has(ds);
            const isLimited = limitedSet.has(ds);
            const mark = isCustom || isLimited;
            return (
              <View key={ci} style={styles.calCellWrap}>
                <Pressable
                  disabled={past}
                  onPress={() => onSelect(ds)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d} de ${MONTHS[cursor.m]}${isClosed ? ', fechado' : ''}${isCustom ? ', horário especial' : ''}${isLimited ? ', com limite de agendamentos' : ''}`}
                  accessibilityState={{ disabled: past, selected: isSel }}
                  style={[
                    styles.calCell,
                    (isClosed || past) && styles.calCellOff,
                    ds === today && !isSel && styles.calCellToday,
                    isSel && styles.calCellSel,
                  ]}
                >
                  <Text
                    style={[
                      styles.calCellText,
                      (isClosed || past) && { color: '#E3CBD3' },
                      isSel && { color: '#FFF', fontFamily: fonts.bodyBold },
                    ]}
                  >
                    {d}
                  </Text>
                  {mark && !past ? <View style={[styles.calDot, isSel && { backgroundColor: '#FFF' }]} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      {loading ? <ActivityIndicator color={colors.pink} style={{ marginTop: 6 }} /> : null}

      <View style={styles.legend}>
        {legend.map((l, i) => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: i === 0 ? 0 : 14 }}>
            <View style={[styles.legendDot, l.small && { width: 6, height: 6 }, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const TIME_STEP = 15;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / TIME_STEP }, (_, i) => minutesToTime(i * TIME_STEP));
const ROW_HEIGHT = 50;

export function TimeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const index = Math.max(0, TIME_OPTIONS.indexOf(value));

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Toque para mudar`}
        style={[styles.timeBox, disabled && { opacity: 0.45 }]}
      >
        <Feather name="clock" size={16} color={colors.muted} />
        <Text style={styles.timeValue}>{value}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Fechar">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(t) => t}
              style={{ maxHeight: ROW_HEIGHT * 7 }}
              initialScrollIndex={Math.max(0, index - 2)}
              getItemLayout={(_, i) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * i, index: i })}
              renderItem={({ item }) => {
                const on = item === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.timeRow, on && styles.timeRowOn]}
                  >
                    <Text style={[styles.timeRowText, on && { color: '#FFF', fontFamily: fonts.bodyBold }]}>{item}</Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function HoursEditor({ value, onChange }: { value: Hours; onChange: (h: Hours) => void }) {
  const hasLunch = value.lunchStart !== null && value.lunchEnd !== null;

  const toggleLunch = (on: boolean) => {
    if (!on) return onChange({ ...value, lunchStart: null, lunchEnd: null });
    const open = timeToMinutes(value.open);
    const close = timeToMinutes(value.close);
    let start = 12 * 60;
    if (start < open || start + 60 > close) start = Math.max(open, Math.floor((open + close) / 2 / TIME_STEP) * TIME_STEP - 30);
    const end = Math.min(close, start + 60);
    onChange({ ...value, lunchStart: minutesToTime(start), lunchEnd: minutesToTime(end) });
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TimeField label="Entrada" value={value.open} onChange={(v) => onChange({ ...value, open: v })} />
        <TimeField label="Saída" value={value.close} onChange={(v) => onChange({ ...value, close: v })} />
      </View>
      <View style={styles.lunchSwitchRow}>
        <Text style={styles.lunchSwitchText}>Horário de almoço</Text>
        <Switch
          value={hasLunch}
          onValueChange={toggleLunch}
          trackColor={{ true: colors.pink, false: '#E5DDE1' }}
          thumbColor="#FFFFFF"
        />
      </View>
      {hasLunch ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TimeField label="Início do almoço" value={value.lunchStart as string} onChange={(v) => onChange({ ...value, lunchStart: v })} />
          <TimeField label="Fim do almoço" value={value.lunchEnd as string} onChange={(v) => onChange({ ...value, lunchEnd: v })} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 14 },
  calMonth: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  calRow: { flexDirection: 'row' },
  calWeekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted, paddingVertical: 8 },
  calCellWrap: { width: `${100 / 7}%`, padding: 3 },
  calCell: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  calCellOff: { backgroundColor: '#FBF8F9' },
  calCellToday: { borderWidth: 1.5, borderColor: colors.pink },
  calCellSel: { backgroundColor: colors.pink },
  calCellText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  calDot: { position: 'absolute', bottom: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.pink },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, marginTop: 14, paddingHorizontal: 10 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted },
  timeLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginBottom: 6 },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: '#EDE7EA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  timeValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(43,27,36,0.45)', justifyContent: 'center', paddingHorizontal: 40 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: 10 },
  timeRow: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  timeRowOn: { backgroundColor: colors.pink },
  timeRowText: { fontFamily: fonts.body, fontSize: 17, color: colors.text },
  lunchSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lunchSwitchText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
});
