import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Chrome';
import { Button, Card, EmptyState, Field, StatusBadge } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { api, ApiError, Appointment } from '../../src/lib/api';
import { formatDateLong, todayStr } from '../../src/lib/format';
import { colors, fonts } from '../../src/theme';

export default function Agendamentos() {
  const router = useRouter();
  const { phone, loggedIn, refreshUnread } = useApp();
  const [list, setList] = useState<Appointment[] | null>(null);
  const [error, setError] = useState(false);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!phone) {
        setList(null);
        return;
      }
      let alive = true;
      setError(false);
      api
        .appointments(phone)
        .then((r) => alive && setList(r))
        .catch(() => alive && setError(true));
      return () => {
        alive = false;
      };
    }, [phone])
  );

  const confirmCancel = (a: Appointment) => {
    Alert.alert('Cancelar agendamento?', `${a.service} em ${formatDateLong(a.date)} às ${a.time}.`, [
      { text: 'Manter', style: 'cancel' },
      {
        text: 'Cancelar agendamento',
        style: 'destructive',
        onPress: async () => {
          setCancelingId(a.id);
          try {
            await api.cancel(a.id, phone);
            setList(await api.appointments(phone));
            refreshUnread();
          } catch (e) {
            Alert.alert('Não foi possível cancelar', (e as ApiError).message);
          } finally {
            setCancelingId(null);
          }
        },
      },
    ]);
  };

  const inactiveCount = (list || []).filter((a) => a.status === 'CANCELED' || a.status === 'REJECTED').length;

  const confirmClearInactive = () => {
    Alert.alert(
      'Apagar cancelados e recusados?',
      `${inactiveCount} ${inactiveCount === 1 ? 'agendamento será apagado' : 'agendamentos serão apagados'} da sua lista. Os agendamentos pendentes, confirmados e atendidos não serão apagados.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await api.clearInactiveAppointments(phone);
              setList(await api.appointments(phone));
            } catch (e) {
              Alert.alert('Não foi possível apagar', (e as ApiError).message);
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const today = todayStr();

  return (
    <Screen title="Meus Agendamentos" subtitle="Consulte e gerencie seus agendamentos">
      {!loggedIn ? (
        <View style={{ alignItems: 'center' }}>
          <EmptyState icon="calendar" subtitle="Entre com seu nome e telefone para ver seus agendamentos" />
          <Button title="Entrar" variant="gradient" onPress={() => router.navigate('/login')} style={{ marginTop: 18, width: 220 }} />
        </View>
      ) : error ? (
        <EmptyState icon="wifi-off" subtitle="Não foi possível carregar. Verifique sua internet." />
      ) : list === null ? (
        <ActivityIndicator color={colors.pink} style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <EmptyState icon="calendar" title="Nenhum agendamento" subtitle="Você ainda não tem agendamentos." />
      ) : null}

      {inactiveCount > 0 ? (
        <Button
          title="Apagar cancelados e recusados"
          variant="outline"
          small
          loading={clearing}
          onPress={confirmClearInactive}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        />
      ) : null}

      <View style={{ gap: 12, marginTop: 8 }}>
        {(list || []).map((a) => {
          const askPresence = a.status === 'CONFIRMED' && !!a.reminderSent && a.date >= today;
          const canCancel = (a.status === 'PENDING' || a.status === 'CONFIRMED') && a.date >= today;
          return (
            <Card key={a.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <Text style={styles.apptService}>{a.service}</Text>
                <StatusBadge status={a.status} />
              </View>
              <Text style={styles.apptWhen}>
                {formatDateLong(a.date)} · {a.time}
              </Text>
              {a.status === 'PENDING' ? <Text style={styles.apptNote}>Aguardando confirmação do ateliê.</Text> : null}
              {a.status === 'REJECTED' && a.rejectReason ? (
                <Text style={styles.apptReason}>Motivo da recusa: {a.rejectReason}</Text>
              ) : null}
              {askPresence ? (
                <PresenceBox
                  a={a}
                  phone={phone}
                  onUpdated={(u) => setList((cur) => (cur || []).map((x) => (x.id === u.id ? { ...x, ...u } : x)))}
                />
              ) : null}
              {canCancel ? (
                <Button
                  title="Cancelar agendamento"
                  variant="danger"
                  small
                  loading={cancelingId === a.id}
                  onPress={() => confirmCancel(a)}
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                />
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function PresenceBox({ a, phone, onUpdated }: { a: Appointment; phone: string; onUpdated: (u: Appointment) => void }) {
  const [declining, setDeclining] = useState(false);
  const [changing, setChanging] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (attending: boolean) => {
    setBusy(true);
    try {
      const updated = await api.respondPresence(a.id, phone, attending, attending ? undefined : reason.trim());
      onUpdated(updated);
      setDeclining(false);
      setChanging(false);
      setReason('');
    } catch (e) {
      Alert.alert('Não foi possível enviar', (e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  if (a.presence && !changing) {
    return (
      <View style={styles.presenceBox}>
        <Text style={[styles.presenceTitle, { color: a.presence === 'YES' ? colors.success : colors.danger }]}>
          {a.presence === 'YES' ? '✓ Presença confirmada' : 'Você avisou que não poderá ir'}
        </Text>
        {a.presence === 'NO' && a.presenceReason ? <Text style={styles.presenceText}>Motivo: {a.presenceReason}</Text> : null}
        <Button title="Alterar resposta" variant="outline" small onPress={() => setChanging(true)} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </View>
    );
  }

  return (
    <View style={styles.presenceBox}>
      <Text style={styles.presenceTitle}>Confirme sua presença</Text>
      <Text style={styles.presenceText}>Você vai comparecer neste horário?</Text>
      {declining ? (
        <View style={{ marginTop: 10 }}>
          <Field
            label="Motivo (obrigatório)"
            placeholder="Ex.: Fiquei doente e preciso remarcar."
            value={reason}
            onChangeText={setReason}
            maxLength={200}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button title="Enviar aviso" small variant="danger" disabled={reason.trim().length < 3} loading={busy} onPress={() => send(false)} />
            <Button title="Voltar" small variant="outline" onPress={() => setDeclining(false)} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Button title="Confirmo presença" small loading={busy} onPress={() => send(true)} />
          <Button title="Não poderei ir" small variant="outline" disabled={busy} onPress={() => setDeclining(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  apptService: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, flex: 1 },
  presenceBox: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: colors.pinkSoft, borderWidth: 1, borderColor: colors.pinkBorder },
  presenceTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  presenceText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 3, lineHeight: 20 },
  apptNote: { fontFamily: fonts.body, fontSize: 13, color: '#A8680B', marginTop: 8 },
  apptReason: { fontFamily: fonts.body, fontSize: 14, color: colors.danger, marginTop: 8, lineHeight: 20 },
  apptWhen: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 6, textTransform: 'capitalize' },
});
