import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../../src/components/Chrome';
import { useAdminErrorHandler } from '../../../src/components/ConfigUI';
import { Button, Card, EmptyState } from '../../../src/components/ui';
import { api, Service } from '../../../src/lib/api';
import { formatDuration } from '../../../src/lib/format';
import { colors, fonts } from '../../../src/theme';

const MIN = 5;
const stepUp = (v: number) => (v < 30 ? 5 : 15);
const stepDown = (v: number) => (v <= 30 ? 5 : 15);
const MAX = 720;
const QUICK = [5, 15, 30, 45, 60, 90, 120];
const DEFAULT_DURATION = 60;

export default function Horarios() {
  const router = useRouter();
  const onError = useAdminErrorHandler();
  const [services, setServices] = useState<Service[] | null>(null);
  const [saved, setSaved] = useState<Record<number, number>>({});
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.admin.services();
      const map: Record<number, number> = {};
      for (const s of list) map[s.id] = s.durationMinutes || DEFAULT_DURATION;
      setServices(list);
      setSaved(map);
      setDraft(map);
    } catch (e) {
      setServices([]);
      onError(e, 'Não foi possível carregar os serviços');
    }
  }, [onError]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changed = (services || []).filter((s) => draft[s.id] !== saved[s.id]);

  const set = (id: number, minutes: number) => setDraft((d) => ({ ...d, [id]: Math.min(MAX, Math.max(MIN, minutes)) }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(changed.map((s) => api.admin.updateService(s.id, { durationMinutes: draft[s.id] })));
      setSaved(draft);
      Alert.alert('Horários salvos', 'As clientes já veem a duração de cada serviço ao agendar.');
    } catch (e) {
      onError(e, 'Não foi possível salvar');
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Horários" subtitle="Duração de cada serviço" onBack={() => (router.canGoBack() ? router.back() : router.replace('/admin/configuracao'))}>
      <Text style={styles.hint}>
        Escolha quanto tempo cada serviço costuma levar. É só um aviso para a cliente ter uma noção da duração: o horário reservado continua sendo o de
        início.
      </Text>

      {services === null ? <ActivityIndicator color={colors.pink} style={{ marginTop: 30 }} /> : null}
      {services !== null && services.length === 0 ? <EmptyState icon="scissors" subtitle="Nenhum serviço cadastrado." /> : null}

      <View style={{ gap: 12, marginTop: 14 }}>
        {(services || []).map((s) => {
          const value = draft[s.id] ?? DEFAULT_DURATION;
          return (
            <Card key={s.id}>
              <View style={styles.head}>
                <Text style={styles.name}>{s.name}</Text>
                {s.active === false ? <Text style={styles.hidden}>Oculto</Text> : null}
              </View>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() => set(s.id, value - stepDown(value))}
                  disabled={value <= MIN}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Diminuir duração de ${s.name}`}
                  style={[styles.stepBtn, value <= MIN && { opacity: 0.35 }]}
                >
                  <Feather name="minus" size={20} color={colors.pinkDark} />
                </Pressable>
                <Text style={styles.duration}>{formatDuration(value)}</Text>
                <Pressable
                  onPress={() => set(s.id, value + stepUp(value))}
                  disabled={value >= MAX}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Aumentar duração de ${s.name}`}
                  style={[styles.stepBtn, value >= MAX && { opacity: 0.35 }]}
                >
                  <Feather name="plus" size={20} color={colors.pinkDark} />
                </Pressable>
              </View>

              <View style={styles.quickRow}>
                {QUICK.map((q) => {
                  const on = value === q;
                  return (
                    <Pressable
                      key={q}
                      onPress={() => set(s.id, q)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, on && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, on && { color: '#FFF' }]}>{formatDuration(q)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </View>

      {services && services.length > 0 ? (
        <Button
          title={changed.length ? `Salvar ${changed.length === 1 ? 'alteração' : 'alterações'}` : 'Tudo salvo'}
          variant="gradient"
          disabled={changed.length === 0}
          loading={saving}
          onPress={save}
          style={{ marginTop: 20 }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, lineHeight: 19, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, flex: 1, paddingRight: 8 },
  hidden: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 14 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pinkSoft, alignItems: 'center', justifyContent: 'center' },
  duration: { fontFamily: fonts.heading, fontSize: 24, color: colors.text, minWidth: 96, textAlign: 'center' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#F7CFDD', backgroundColor: '#FFF0F5', paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.pink, borderColor: colors.pink },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#8E2D5A' },
});
