import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Mostra a notificação mesmo com o app aberto (banner + som).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;
let lastError: string | null = null;

const REGISTER_EVERY_MS = 6 * 60 * 60 * 1000;
const lastRegistered = new Map<string, number>();

/**
 * Envia o token ao servidor com novas tentativas (rede ruim, servidor ocupado ou limite de requisições).
 * Não repete o mesmo registro em menos de 6 horas, para não gastar o limite da API toda vez que o app abre.
 * Devolve true quando o servidor aceitou o token.
 */
export async function registerTokenWithRetry(owner: string, token: string, send: (token: string) => Promise<unknown>) {
  const key = `${owner}|${token}`;
  const last = lastRegistered.get(key);
  if (last && Date.now() - last < REGISTER_EVERY_MS) return true;
  const waits = [0, 2000, 6000, 15000];
  for (const wait of waits) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      await send(token);
      lastRegistered.set(key, Date.now());
      return true;
    } catch (e) {
      lastError = `Não foi possível registrar o aparelho no servidor: ${(e as Error)?.message ?? e}`;
      console.warn('[push]', lastError);
    }
  }
  return false;
}

export function forgetRegistration() {
  lastRegistered.clear();
}

export function getRegisteredToken() {
  return currentToken;
}

/** Último motivo pelo qual o push não foi ativado (útil para diagnóstico). */
export function getPushError() {
  return lastError;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  // O canal precisa existir ANTES de pedir permissão/token (Android 13+).
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Avisos do ateliê',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E0789C',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

export async function getPushToken(): Promise<string | null> {
  lastError = null;
  try {
    if (!Device.isDevice) {
      lastError = 'Push não funciona em emulador.';
      return null;
    }

    await ensureAndroidChannel();

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') {
      lastError = 'Permissão de notificações negada. Ative em Configurações > Apps > Bela Donzela > Notificações.';
      console.warn('[push]', lastError);
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    if (!projectId) {
      lastError = 'Falta o projectId do EAS.';
      console.warn('[push]', lastError);
      return null;
    }

    // Tenta algumas vezes: a primeira chamada pode falhar logo após abrir o app / sem rede.
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
        currentToken = data;
        console.log('[push] token registrado:', data);
        return data;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    // Normalmente cai aqui quando o APK foi gerado SEM google-services.json (FCM não configurado).
    lastError = `Não foi possível obter o token de push: ${(lastErr as Error)?.message ?? lastErr}`;
    console.warn('[push]', lastError);
    return null;
  } catch (e) {
    lastError = `Push indisponível neste aparelho: ${(e as Error)?.message ?? e}`;
    console.warn('[push]', lastError);
    return null;
  }
}

/**
 * Chama `register(token)` sempre que o token for obtido/renovado:
 * ao abrir, ao voltar do segundo plano (via AppState no chamador) e quando o Firebase rotaciona o token.
 */
export function onPushTokenRefresh(register: (token: string) => void) {
  const sub = Notifications.addPushTokenListener(async () => {
    const t = await getPushToken();
    if (t) register(t);
  });
  return () => sub.remove();
}

export function usePushNavigation() {
  const router = useRouter();
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const screen = response?.notification.request.content.data?.screen;
      if (typeof screen === 'string') router.navigate(screen as any);
    };
    // Toque com o app aberto/em segundo plano.
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    // Toque com o app fechado (abriu o app pela notificação).
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    return () => sub.remove();
  }, [router]);
}
