import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScroll } from '../src/components/KeyboardAwareScroll';
import { Button, Card, Field, GradientBackground, LogoCard } from '../src/components/ui';
import { useApp } from '../src/context/AppContext';
import { api, ApiError } from '../src/lib/api';
import { isPhoneComplete, maskPhone, phoneDigits } from '../src/lib/format';
import { colors, fonts } from '../src/theme';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setContact, setAdminPhone, setAdminName, refreshUnread } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length >= 2 && isPhoneComplete(phone);

  const submit = async () => {
    setLoading(true);
    try {
      const r = await api.login(name.trim(), phoneDigits(phone));
      if (r.admin) {
        setAdminPhone(phoneDigits(phone));
        setAdminName(name.trim());
        router.replace('/admin/login');
        return;
      }
      await setContact(r.user.phone, r.user.name);
      refreshUnread();
      router.replace('/agendar');
    } catch (e) {
      Alert.alert('Não foi possível entrar', (e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <GradientBackground>
      <KeyboardAwareScroll
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </Pressable>

          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <LogoCard width={230} />
            <Text style={styles.welcome}>Bora agendar?</Text>
            <Text style={styles.script}>Bela Donzela</Text>
            <Text style={styles.sub}>Informe seu nome e telefone para continuar. Você só precisa fazer isso uma vez.</Text>
          </View>

          <Card style={{ marginTop: 24, borderRadius: 26, paddingTop: 20 }}>
            <Field
              label="Nome completo"
              icon="user"
              placeholder="Seu nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              maxLength={80}
            />
            <Field
              label="Telefone (WhatsApp)"
              icon="phone"
              placeholder="(17) 99999-9999"
              value={phone}
              onChangeText={(t) => setPhone(maskPhone(t))}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={15}
              onSubmitEditing={() => canSubmit && !loading && submit()}
            />
            <Button
              title="Continuar"
              variant="gradient"
              icon={<Feather name="arrow-right" size={18} color={canSubmit ? '#FFF' : colors.disabledText} />}
              disabled={!canSubmit}
              loading={loading}
              onPress={submit}
              style={{ marginTop: 4 }}
            />
          </Card>

          <Text style={styles.hint}>Usamos seu telefone para confirmar e lembrar seus agendamentos.</Text>
      </KeyboardAwareScroll>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: { fontFamily: fonts.heading, fontSize: 26, color: colors.text, marginTop: 22 },
  script: { fontFamily: fonts.script, fontSize: 42, color: colors.pink, marginTop: -4 },
  sub: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.muted, textAlign: 'center', paddingHorizontal: 12, marginTop: 4 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted, textAlign: 'center', marginTop: 18, paddingHorizontal: 20 },
});
