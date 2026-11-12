import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../../src/components/Chrome';
import { Button, Card, EmptyState, Field, StatusBadge } from '../../src/components/ui';
import { AgendaMonth, api, ApiError, AppNotification, Appointment, Service } from '../../src/lib/api';
import { daysInMonth, formatDateLong, formatDuration, formatNotificationDate, MONTHS, toDateStr, todayStr, WEEKDAYS_SHORT } from '../../src/lib/format';
import { AppState as RNAppState } from 'react-native';
import { forgetRegistration, getPushToken, getRegisteredToken, onPushTokenRefresh, registerTokenWithRetry } from '../../src/lib/push';
import { colors, fonts } from '../../src/theme';

type Tab = 'agenda' | 'concluidos' | 'notificacoes' | 'servicos';

const TABS: { key: Tab; label: string }[] = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'concluidos', label: 'Concluídos' },
  { key: 'notificacoes', label: 'Notificações' },
  { key: 'servicos', label: 'Serviços' },
];

export default function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('agenda');
  const [summary, setSummary] = useState({ unreadNotifications: 0 });

  useEffect(() => {
    let alive = true;
    const register = async () => {
      const token = await getPushToken();
      if (token && alive) await registerTokenWithRetry('admin', token, (t) => api.admin.registerPush(t));
    };
    register();
    const appSub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') register();
    });
    const offRefresh = onPushTokenRefresh((t) => {
      if (alive) registerTokenWithRetry('admin', t, (x) => api.admin.registerPush(x));
    });
    return () => {
      alive = false;
      appSub.remove();
      offRefresh();
    };
  }, []);

  const logout = async () => {
    const pushToken = getRegisteredToken();
    if (pushToken) await api.admin.unregisterPush(pushToken).catch(() => {});
    forgetRegistration();
    await api.admin.logout();
    router.replace('/admin/login');
  };

  const handleError = useCallback(
    (e: unknown, title: string) => {
      const err = e as ApiError;
      if (err.status === 401) {
        api.admin.logout().finally(() => router.replace('/admin/login'));
        return;
      }
      Alert.alert(title, err.message);
    },
    [router]
  );

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await api.admin.summary());
    } catch (e) {
      if ((e as ApiError).status === 401) handleError(e, '');
    }
  }, [handleError]);

  useFocusEffect(
    useCallback(() => {
      refreshSummary();
      const id = setInterval(refreshSummary, 30000);
      return () => clearInterval(id);
    }, [refreshSummary])
  );

  return (
    <Screen title="Painel" subtitle="Área Administrativa" back={false}>
      <Pressable
        onPress={() => router.push('/admin/configuracao')}
        accessibilityRole="button"
        accessibilityLabel="Abrir configurações"
        style={({ pressed }) => [styles.configBtn, pressed && { opacity: 0.7 }]}
      >
        <Feather name="settings" size={18} color={colors.pinkDark} />
        <Text style={styles.configText}>Configuração</Text>
        <Feather name="chevron-right" size={18} color={colors.muted} />
      </Pressable>

      <View style={styles.segment}>
        {TABS.map((t) => {
          const count = t.key === 'notificacoes' ? summary.unreadNotifications : 0;
          const on = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.segBtn, on && styles.segBtnOn]} accessibilityRole="button">
              <Text style={[styles.segText, on && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {t.label}
              </Text>
              {count > 0 ? (
                <View style={[styles.countBadge, on && { backgroundColor: '#FFF' }]}>
                  <Text style={[styles.countText, on && { color: colors.pinkDark }]}>{count > 99 ? '99+' : count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === 'agenda' ? <AgendaTab onError={handleError} /> : null}
      {tab === 'concluidos' ? <DoneTab onError={handleError} /> : null}
      {tab === 'notificacoes' ? <AdminNotificationsTab onError={handleError} onChanged={refreshSummary} /> : null}
      {tab === 'servicos' ? <ServicesTab onError={handleError} /> : null}

      <Button title="Sair da Área Administrativa" variant="outline" small onPress={logout} style={{ marginTop: 28, alignSelf: 'center' }} />
    </Screen>
  );
}

type OnError = (e: unknown, title: string) => void;

const WA_GRAY = '#8696A0';
const WA_BLUE = '#53BDEB';

function PresenceChecks({ a }: { a: Appointment }) {
  const needsPresence = a.needsPresence !== false;
  const confirmedByClient = needsPresence && a.presence === 'YES';
  const declined = needsPresence && a.presence === 'NO';

  let text = 'Agendamento confirmado.';
  let color: string = colors.muted;
  if (needsPresence) {
    if (confirmedByClient) {
      text = 'Cliente confirmou a presença.';
      color = '#2A8FBF';
    } else if (declined) {
      text = `Não confirmou a presença. Motivo: ${a.presenceReason || 'não informado'}`;
      color = colors.danger;
    } else if (a.reminderSent) {
      text = 'Lembrete enviado. Aguardando a resposta da cliente.';
    } else {
      text = 'O lembrete é enviado automaticamente 1 dia antes.';
    }
  }

  return (
    <View
      style={styles.checksRow}
      accessible
      accessibilityLabel={`Agendamento confirmado. ${needsPresence ? (confirmedByClient ? 'Presença confirmada pela cliente.' : 'Presença ainda não confirmada.') : 'Agendado em cima da hora, sem segunda confirmação.'} ${text}`}
    >
      <MaterialCommunityIcons
        name={needsPresence ? 'check-all' : 'check'}
        size={22}
        color={confirmedByClient ? WA_BLUE : WA_GRAY}
      />
      <Text style={[styles.checksText, { color }]}>{text}</Text>
    </View>
  );
}

function AdminCalendar({
  cursor,
  setCursor,
  selected,
  onSelect,
  data,
}: {
  cursor: { y: number; m: number };
  setCursor: (c: { y: number; m: number }) => void;
  selected: string;
  onSelect: (d: string) => void;
  data: AgendaMonth | null;
}) {
  const today = todayStr();
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
        <Pressable onPress={() => move(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Mês anterior" style={{ padding: 6 }}>
          <Feather name="chevron-left" size={22} color={colors.muted} />
        </Pressable>
        <Text style={styles.calMonth}>
          {MONTHS[cursor.m]} {cursor.y}
        </Text>
        <Pressable onPress={() => move(1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Próximo mês" style={{ padding: 6 }}>
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
            const isSel = selected === ds;
            const closed = !!data && (data.closed || data.blocked).includes(ds);
            const count = data?.counts[ds] || 0;
            return (
              <View key={ci} style={styles.calCellWrap}>
                <Pressable
                  onPress={() => onSelect(ds)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d} de ${MONTHS[cursor.m]}${count ? `, ${count} agendamento(s)` : ''}${closed ? ', dia fechado' : ''}`}
                  accessibilityState={{ selected: isSel }}
                  style={[styles.calCell, closed && styles.calCellOff, ds === today && !isSel && styles.calCellToday, isSel && styles.calCellSel]}
                >
                  <Text style={[styles.calCellText, closed && { color: '#E3CBD3' }, isSel && { color: '#FFF', fontFamily: fonts.bodyBold }]}>{d}</Text>
                  {count > 0 ? <View style={[styles.calDot, isSel && { backgroundColor: '#FFF' }]} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      {!data ? <ActivityIndicator color={colors.pink} style={{ marginTop: 6 }} /> : null}

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#F4EEF0' }]} />
        <Text style={styles.legendText}>Fechado</Text>
        <View style={[styles.legendDot, { backgroundColor: colors.pink, marginLeft: 14 }]} />
        <Text style={styles.legendText}>Selecionado</Text>
        <View style={[styles.legendDot, { width: 6, height: 6, backgroundColor: colors.pink, marginLeft: 14 }]} />
        <Text style={styles.legendText}>Com agendamentos</Text>
      </View>
    </Card>
  );
}

function AgendaTab({ onError }: { onError: OnError }) {
  const [date, setDate] = useState(todayStr());
  const [cursor, setCursor] = useState(() => {
    const [y, m] = todayStr().split('-').map(Number);
    return { y, m: m - 1 };
  });
  const [list, setList] = useState<Appointment[] | null>(null);
  const [month, setMonth] = useState<AgendaMonth | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const monthKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    try {
      setMonth(await api.admin.agendaMonth(monthKey));
    } catch (e) {
      onError(e, 'Não foi possível carregar o calendário');
    }
  }, [monthKey, onError]);

  const loadDay = useCallback(
    async (d: string) => {
      setList(null);
      try {
        setList(await api.admin.appointments(d));
      } catch (e) {
        setList([]);
        onError(e, 'Não foi possível carregar');
      }
    },
    [onError]
  );

  useFocusEffect(
    useCallback(() => {
      setMonth(null);
      loadMonth();
    }, [loadMonth])
  );

  useFocusEffect(
    useCallback(() => {
      loadDay(date);
    }, [loadDay, date])
  );

  const isBlocked = !!month && month.blocked.includes(date);

  const confirmCancel = (a: Appointment) =>
    Alert.alert(
      'Cancelar este agendamento?',
      `${a.clientName} · ${a.service} em ${formatDateLong(a.date)} às ${a.time}. O horário será liberado e a cliente será avisada.`,
      [
        { text: 'Manter', style: 'cancel' },
        {
          text: 'Cancelar agendamento',
          style: 'destructive',
          onPress: async () => {
            setCancelingId(a.id);
            try {
              await api.admin.cancelAppointment(a.id);
              await Promise.all([loadDay(date), loadMonth()]);
            } catch (e) {
              onError(e, 'Não foi possível cancelar');
              loadDay(date);
            } finally {
              setCancelingId(null);
            }
          },
        },
      ]
    );

  const toggleDay = async () => {
    try {
      if (isBlocked) {
        await api.admin.unblockDay(date);
      } else {
        const r = await api.admin.blockDay(date);
        if (r.confirmedAppointments > 0) {
          Alert.alert(
            'Dia fechado',
            `Atenção: ${r.confirmedAppointments} agendamento(s) confirmado(s) neste dia continuam ativos. Cancele-os na Agenda, se precisar.`
          );
        }
      }
      await loadMonth();
    } catch (e) {
      onError(e, 'Não foi possível alterar o dia');
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      <AdminCalendar
        cursor={cursor}
        setCursor={setCursor}
        selected={date}
        onSelect={(d) => {
          setDate(d);
        }}
        data={month}
      />

      <Text style={styles.dayTitle}>{formatDateLong(date)}</Text>
      <Button
        title={isBlocked ? 'Reabrir este dia' : 'Fechar este dia para agendamentos'}
        variant={isBlocked ? 'solid' : 'outline'}
        small
        onPress={toggleDay}
        style={{ marginTop: 10 }}
      />

      {list === null ? <ActivityIndicator color={colors.pink} style={{ marginTop: 30 }} /> : null}
      {list !== null && list.length === 0 ? (
        <EmptyState icon="calendar" subtitle={isBlocked ? 'Dia fechado.' : 'Nenhum agendamento confirmado neste dia.'} />
      ) : null}

      <View style={{ gap: 12, marginTop: 16 }}>
        {(list || []).map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.time}>{a.time}</Text>
              <StatusBadge status={a.status} />
            </View>
            <Text style={styles.client}>{a.clientName}</Text>
            <Text style={styles.meta}>{a.service}</Text>
            <Pressable onPress={() => a.phone && Linking.openURL(`https://wa.me/55${a.phone}`)} accessibilityRole="link">
              <Text style={[styles.meta, { color: colors.pinkDark }]}>{a.phone}</Text>
            </Pressable>
            <PresenceChecks a={a} />
            <Button
              title="Cancelar agendamento"
              variant="danger"
              small
              loading={cancelingId === a.id}
              onPress={() => confirmCancel(a)}
              style={{ marginTop: 12, alignSelf: 'flex-start' }}
            />
          </Card>
        ))}
      </View>
    </View>
  );
}

function DoneTab({ onError }: { onError: OnError }) {
  const [list, setList] = useState<Appointment[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.admin.done();
      setList(r);
      setSelected((cur) => cur.filter((id) => r.some((a) => a.id === id)));
    } catch (e) {
      setList([]);
      onError(e, 'Não foi possível carregar');
    }
  }, [onError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selecting = selected.length > 0;
  const toggle = (id: number) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const clear = () => setSelected([]);
  const all = list || [];
  const allSelected = all.length > 0 && selected.length === all.length;

  const remove = async (ids: number[]) => {
    setBusy(true);
    try {
      await api.admin.deleteDone(ids);
      clear();
      await load();
    } catch (e) {
      onError(e, 'Não foi possível apagar');
      load();
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (ids: number[]) =>
    Alert.alert(
      ids.length === 1 ? 'Apagar este agendamento?' : `Apagar ${ids.length} agendamentos?`,
      'Eles serão removidos da lista e do banco de dados. Isso não pode ser desfeito.',
      [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: () => remove(ids) },
      ]
    );

  const askDeleteAll = () =>
    Alert.alert('Apagar todos os concluídos?', `Os ${all.length} agendamentos concluídos serão removidos da lista e do banco de dados. Isso não pode ser desfeito.`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Apagar todos',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.admin.deleteAllDone();
            clear();
            await load();
          } catch (e) {
            onError(e, 'Não foi possível apagar');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      {list === null ? <ActivityIndicator color={colors.pink} style={{ marginTop: 30 }} /> : null}
      {list !== null && all.length === 0 ? (
        <EmptyState icon="check-circle" title="Nenhum concluído" subtitle="Os agendamentos que já aconteceram aparecem aqui." />
      ) : null}

      {all.length > 0 && !selecting ? (
        <>
          <Text style={styles.meta}>Segure um agendamento para selecionar vários e apagar de uma vez.</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button title="Selecionar todos" small variant="outline" disabled={busy} onPress={() => setSelected(all.map((a) => a.id))} />
            <Button title="Apagar todos os concluídos" variant="danger" small loading={busy} onPress={askDeleteAll} />
          </View>
        </>
      ) : null}

      {selecting ? (
        <Card style={{ gap: 10 }}>
          <Text style={styles.client}>
            {selected.length} selecionado{selected.length > 1 ? 's' : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button title="Apagar selecionados" small variant="danger" loading={busy} onPress={() => askDelete(selected)} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              small
              variant="outline"
              disabled={busy}
              onPress={() => setSelected(allSelected ? [] : all.map((a) => a.id))}
            />
            <Button title="Cancelar seleção" small variant="outline" disabled={busy} onPress={clear} />
          </View>
        </Card>
      ) : null}

      {all.map((a) => {
        const on = selected.includes(a.id);
        return (
          <Pressable
            key={a.id}
            onLongPress={() => toggle(a.id)}
            onPress={() => selecting && toggle(a.id)}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityHint="Segure para selecionar"
          >
            <Card style={on ? { borderColor: colors.pink, borderWidth: 2, backgroundColor: colors.pinkSoft } : undefined}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {selecting ? <Feather name={on ? 'check-circle' : 'circle'} size={22} color={on ? colors.pink : '#CDBFC7'} /> : null}
                  <Text style={styles.pendingWhen}>
                    {formatDateLong(a.date)} · {a.time}
                  </Text>
                </View>
                <StatusBadge status={a.status} />
              </View>
              <Text style={styles.client}>{a.clientName}</Text>
              <Text style={styles.meta}>{a.service}</Text>
              <Pressable onPress={() => a.phone && Linking.openURL(`https://wa.me/55${a.phone}`)} accessibilityRole="link">
                <Text style={[styles.meta, { color: colors.pinkDark }]}>{a.phone}</Text>
              </Pressable>
              {!selecting ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <Button title="Apagar" small variant="danger" disabled={busy} onPress={() => askDelete([a.id])} />
                </View>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function AdminNotificationsTab({ onError, onChanged }: { onError: OnError; onChanged: () => void }) {
  const [list, setList] = useState<AppNotification[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api.admin
        .notifications()
        .then(async (r) => {
          if (!alive) return;
          setList(r);
          if (r.some((n) => !n.read)) {
            await api.admin.markNotificationsRead().catch(() => {});
            onChanged();
          }
        })
        .catch((e) => {
          if (!alive) return;
          setList([]);
          onError(e, 'Não foi possível carregar');
        });
      return () => {
        alive = false;
      };
    }, [onError, onChanged])
  );

  const clearAll = () =>
    Alert.alert('Apagar notificações', 'Deseja apagar todas as notificações do ateliê? As das clientes não são afetadas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar tudo',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.admin.clearNotifications();
            setList([]);
            onChanged();
          } catch (e) {
            onError(e, 'Não foi possível apagar');
          }
        },
      },
    ]);

  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      {list !== null && list.length > 0 ? (
        <Button title="Apagar todas" variant="outline" small icon={<Feather name="trash-2" size={16} color={colors.pink} />} onPress={clearAll} style={{ alignSelf: 'flex-end' }} />
      ) : null}
      {list === null ? <ActivityIndicator color={colors.pink} style={{ marginTop: 30 }} /> : null}
      {list !== null && list.length === 0 ? <EmptyState round icon="bell-off" title="Nenhuma notificação" subtitle="Os novos agendamentos aparecem aqui." /> : null}
      {(list || []).map((n) => (
        <Card key={n.id} style={[styles.notifRow, !n.read && { borderColor: colors.pink }]}>
          <View style={styles.notifIcon}>
            <Feather name="bell" size={18} color={colors.pink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>{n.title}</Text>
            <Text style={styles.notifMsg}>{n.message}</Text>
            <Text style={styles.notifDate}>{formatNotificationDate(n.createdAt)}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

function ServicesTab({ onError }: { onError: OnError }) {
  const [list, setList] = useState<Service[] | null>(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await api.admin.services());
    } catch (e) {
      setList([]);
      onError(e, 'Não foi possível carregar');
    }
  }, [onError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = async () => {
    if (name.trim().length < 2) return;
    setAdding(true);
    try {
      await api.admin.addService(name.trim());
      setName('');
      await load();
    } catch (e) {
      onError(e, 'Não foi possível adicionar');
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (s: Service, active: boolean) => {
    setList((cur) => (cur || []).map((x) => (x.id === s.id ? { ...x, active } : x)));
    try {
      await api.admin.updateService(s.id, { active });
    } catch (e) {
      onError(e, 'Não foi possível atualizar');
      load();
    }
  };

  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      <Card>
        <Text style={styles.client}>Novo serviço</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Field placeholder="Ex.: Massagem Modeladora" value={name} onChangeText={setName} maxLength={60} />
          </View>
          <Button title="Adicionar" small disabled={name.trim().length < 2} loading={adding} onPress={add} style={{ height: 54, marginBottom: 14 }} />
        </View>
      </Card>

      {list === null ? <ActivityIndicator color={colors.pink} style={{ marginTop: 20 }} /> : null}
      {(list || []).map((s) => (
        <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.client}>{s.name}</Text>
            <Text style={styles.meta}>{s.active ? 'Visível para as clientes' : 'Oculto'}{s.durationMinutes ? ` · ${formatDuration(s.durationMinutes)}` : ''}</Text>
          </View>
          <Switch
            value={!!s.active}
            onValueChange={(v) => toggle(s, v)}
            trackColor={{ true: colors.pink, false: '#E5DDE1' }}
            thumbColor="#FFFFFF"
          />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  configBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: colors.pinkBorder, paddingHorizontal: 16, height: 40, marginTop: 8 },
  configText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.pinkDark },
  segment: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.pinkBorder, marginTop: 14 },
  segBtn: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segBtnOn: { backgroundColor: colors.pink },
  segText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.muted },
  dayTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, textTransform: 'capitalize', marginTop: 18 },
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
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  dateText: { fontFamily: fonts.heading, fontSize: 16, color: colors.text, textTransform: 'capitalize' },
  todayLink: { fontFamily: fonts.body, fontSize: 12, color: colors.pinkDark, marginTop: 2 },
  time: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  client: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, marginTop: 4 },
  meta: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 2 },
  checksRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.pinkBorder },
  checksText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, flex: 1 },
  pendingWhen: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, flex: 1, paddingRight: 8, textTransform: 'capitalize' },
  countBadge: { position: 'absolute', top: -5, right: 2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#FFF' },
  notifRow: { flexDirection: 'row', gap: 12, padding: 14 },
  notifIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  notifMsg: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 3, lineHeight: 20 },
  notifDate: { fontFamily: fonts.body, fontSize: 12, color: '#B9A5AE', marginTop: 6 },
});
