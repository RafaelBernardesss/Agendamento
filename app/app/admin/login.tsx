import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScroll } from '../../src/components/KeyboardAwareScroll';
import { Button, Card, Field, GradientBackground, LogoCard } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { api, ApiError } from '../../src/lib/api';
import { isPhoneComplete, maskPhone, phoneDigits } from '../../src/lib/format';
import { colors, fonts } from '../../src/theme';

const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function AdminLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { adminPhone, setAdminPhone, adminName, setAdminName } = useApp();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [phone, setPhone] = useState(adminPhone ? maskPhone(adminPhone) : '');
  const [name, setName] = useState(adminName);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    api.admin.hasToken().then((has) => has && router.replace('/admin'));
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const emailOk = EMAIL_RE.test(email.trim());
  const canSend = emailOk && isPhoneComplete(phone) && name.trim().length >= 2;
  const canVerify = code.length === 6;

  const sendCode = async () => {
    setLoading(true);
    try {
      await api.admin.requestCode(phoneDigits(phone), name.trim(), email.trim());
      setCode('');
      setCooldown(RESEND_SECONDS);
      setStep('code');
    } catch (e) {
      Alert.alert('Não foi possível enviar o código', (e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    try {
      await api.admin.verifyCode(phoneDigits(phone), name.trim(), email.trim(), code);
      setAdminPhone('');
      setAdminName('');
      router.replace('/admin');
    } catch (e) {
      setCode('');
      Alert.alert('Não foi possível entrar', (e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === 'code') {
      setStep('email');
      return;
    }
    setAdminPhone('');
    setAdminName('');
    router.canGoBack() ? router.back() : router.replace('/');
  };

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
            <LogoCard width={200} />
            <Text style={styles.title}>Área Administrativa</Text>
            <Text style={styles.sub}>
              {step === 'email'
                ? 'Informe o e-mail do administrador para receber um código de acesso.'
                : `Enviamos um código de 6 dígitos para ${email.trim()}.`}
            </Text>
          </View>

          <Card style={{ marginTop: 24, borderRadius: 26, paddingTop: 20 }}>
            {step === 'email' ? (
              <>
                {!adminName ? (
                  <Field
                    label="Nome completo"
                    icon="user"
                    placeholder="Seu nome"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    maxLength={80}
                  />
                ) : null}
                {!adminPhone ? (
                  <Field
                    label="Telefone"
                    icon="phone"
                    placeholder="(17) 99999-9999"
                    value={phone}
                    onChangeText={(t) => setPhone(maskPhone(t))}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                ) : null}
                <Field
                  label="E-mail"
                  icon="mail"
                  placeholder="seu@email.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  onSubmitEditing={() => canSend && !loading && sendCode()}
                />
                <Button
                  title="Enviar código"
                  variant="gradient"
                  icon={<Feather name="send" size={18} color={canSend ? '#FFF' : colors.disabledText} />}
                  disabled={!canSend}
                  loading={loading}
                  onPress={sendCode}
                  style={{ marginTop: 4 }}
                />
              </>
            ) : (
              <>
                <Field
                  label="Código de verificação"
                  icon="key"
                  placeholder="000000"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  style={{ letterSpacing: 6, fontFamily: fonts.bodyBold, fontSize: 18 }}
                  onSubmitEditing={() => canVerify && !loading && verify()}
                />
                <Button
                  title="Entrar"
                  variant="gradient"
                  icon={<Feather name="lock" size={18} color={canVerify ? '#FFF' : colors.disabledText} />}
                  disabled={!canVerify}
                  loading={loading}
                  onPress={verify}
                  style={{ marginTop: 4 }}
                />
                <Pressable
                  onPress={sendCode}
                  disabled={cooldown > 0 || loading}
                  accessibilityRole="button"
                  style={{ alignSelf: 'center', marginTop: 14, padding: 8, opacity: cooldown > 0 ? 0.5 : 1 }}
                >
                  <Text style={styles.resend}>{cooldown > 0 ? `Reenviar código em ${cooldown}s` : 'Reenviar código'}</Text>
                </Pressable>
              </>
            )}
          </Card>

          <Pressable
            onPress={() => {
              setAdminPhone('');
              setAdminName('');
              router.canGoBack() ? router.back() : router.replace('/');
            }}
            style={{ alignSelf: 'center', marginTop: 22, padding: 8 }}
          >
            <Text style={styles.back}>← Voltar ao aplicativo</Text>
          </Pressable>
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
  title: { fontFamily: fonts.heading, fontSize: 26, color: colors.text, marginTop: 22 },
  sub: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21, color: colors.muted, textAlign: 'center', paddingHorizontal: 12, marginTop: 6 },
  resend: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.pinkDark },
  back: { fontFamily: fonts.body, fontSize: 14.5, color: colors.muted },
});
