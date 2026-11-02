import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Chrome';
import { Button, Card, EmptyState } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { api, AppNotification } from '../../src/lib/api';
import { formatNotificationDate } from '../../src/lib/format';
import { colors, fonts } from '../../src/theme';

export default function Notificacoes() {
  const router = useRouter();
  const { phone, refreshUnread } = useApp();
  const [list, setList] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!phone) {
        setList([]);
        return;
      }
      let alive = true;
      setError(false);
      api
        .notifications(phone)
        .then(async (r) => {
          if (!alive) return;
          setList(r);
          if (r.some((n) => !n.read)) {
            await api.markNotificationsRead(phone).catch(() => {});
            refreshUnread();
          }
        })
        .catch(() => alive && setError(true));
      return () => {
        alive = false;
      };
    }, [phone, refreshUnread])
  );

  const clearAll = () =>
    Alert.alert('Apagar notificações', 'Deseja apagar todas as suas notificações? Isso não afeta outras pessoas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar tudo',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.clearNotifications(phone);
            setList([]);
            refreshUnread();
          } catch {
            Alert.alert('Não foi possível apagar', 'Verifique sua internet e tente novamente.');
          }
        },
      },
    ]);

  const unreadCount = (list || []).filter((n) => !n.read).length;
  const subtitle = unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'nova' : 'novas'}` : 'Tudo em dia';

  return (
    <Screen title="Notificações" subtitle={subtitle}>
      {error ? (
        <EmptyState icon="wifi-off" subtitle="Não foi possível carregar. Verifique sua internet." />
      ) : list === null ? (
        <ActivityIndicator color={colors.pink} style={{ marginTop: 60 }} />
      ) : list.length === 0 ? (
        <EmptyState
          round
          icon="bell-off"
          title="Nenhuma notificação"
          subtitle="Faça um agendamento para ver suas notificações"
        />
      ) : (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Button title="Apagar todas" variant="outline" small icon={<Feather name="trash-2" size={16} color={colors.pink} />} onPress={clearAll} style={{ alignSelf: 'flex-end' }} />
          {list.map((n) => (
            <Pressable
              key={n.id}
              disabled={n.kind !== 'REMINDER'}
              onPress={() => router.navigate('/agendamentos')}
              accessibilityRole={n.kind === 'REMINDER' ? 'button' : undefined}
            >
              <Card style={[styles.row, !n.read && styles.unread]}>
                <View style={styles.iconWrap}>
                  <Feather name={n.kind === 'REMINDER' ? 'check-circle' : 'bell'} size={18} color={colors.pink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{n.title}</Text>
                  <Text style={styles.msg}>{n.message}</Text>
                  <Text style={styles.date}>{formatNotificationDate(n.createdAt)}</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, padding: 14 },
  unread: { borderColor: colors.pink },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  msg: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginTop: 3, lineHeight: 20 },
  date: { fontFamily: fonts.body, fontSize: 12, color: '#B9A5AE', marginTop: 6 },
});
