import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { phoneDigits } from '../lib/format';
import { AppState as RNAppState } from 'react-native';
import { getPushToken, getRegisteredToken, onPushTokenRefresh } from '../lib/push';

const PHONE_KEY = 'bd_phone';
const NAME_KEY = 'bd_name';

type AppState = {
  ready: boolean;
  phone: string;
  name: string;
  loggedIn: boolean;
  setContact: (phone: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  adminPhone: string;
  setAdminPhone: (phone: string) => void;
  adminName: string;
  setAdminName: (name: string) => void;
  unread: number;
  refreshUnread: () => Promise<void>;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminPhone, setAdminPhone] = useState('');
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [p, n] = await Promise.all([AsyncStorage.getItem(PHONE_KEY), AsyncStorage.getItem(NAME_KEY)]);
        if (p) setPhone(p);
        if (n) setName(n);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setContact = useCallback(async (p: string, n?: string) => {
    const digits = phoneDigits(p);
    setPhone(digits);
    await AsyncStorage.setItem(PHONE_KEY, digits);
    if (n !== undefined) {
      setName(n);
      await AsyncStorage.setItem(NAME_KEY, n);
    }
  }, []);

  const logout = useCallback(async () => {
    const pushToken = getRegisteredToken();
    if (pushToken) api.unregisterPush(pushToken).catch(() => {});
    setPhone('');
    setName('');
    setUnread(0);
    await Promise.all([AsyncStorage.removeItem(PHONE_KEY), AsyncStorage.removeItem(NAME_KEY)]);
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!phone) {
      setUnread(0);
      return;
    }
    try {
      const list = await api.notifications(phone);
      setUnread(list.filter((x) => !x.read).length);
    } catch {
    }
  }, [phone]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!phone || !name) return;
    let alive = true;
    const register = async () => {
      const token = await getPushToken();
      if (token && alive) await api.registerPush(phone, token).catch(() => {});
    };
    register();
    // Re-registra ao voltar para o app e quando o token é renovado.
    const appSub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') register();
    });
    const offRefresh = onPushTokenRefresh((t) => {
      if (alive) api.registerPush(phone, t).catch(() => {});
    });
    return () => {
      alive = false;
      appSub.remove();
      offRefresh();
    };
  }, [phone, name]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      phone,
      name,
      loggedIn: !!phone && !!name,
      setContact,
      logout,
      adminPhone,
      setAdminPhone,
      adminName,
      setAdminName,
      unread,
      refreshUnread,
      menuOpen,
      openMenu: () => setMenuOpen(true),
      closeMenu: () => setMenuOpen(false),
    }),
    [ready, phone, name, setContact, logout, adminPhone, adminName, unread, refreshUnread, menuOpen]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return v;
}
