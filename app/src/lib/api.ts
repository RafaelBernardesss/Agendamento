import * as SecureStore from 'expo-secure-store';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const TIMEOUT_MS = 15000;
const ADMIN_TOKEN_KEY = 'bd_admin_token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Service = { id: number; name: string; active?: boolean; durationMinutes?: number };
export type DayAvailability = { date: string; open: boolean; freeSlots: number };
export type Appointment = {
  id: number;
  clientName: string;
  phone?: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELED' | 'DONE';
  rejectReason?: string;
  needsPresence?: boolean;
  reminderSent?: boolean;
  presence?: 'YES' | 'NO';
  presenceReason?: string;
  service?: string;
  services?: string[];
  durationMinutes?: number;
};
export type AppNotification = { id: number; title: string; message: string; kind?: string | null; read: boolean; createdAt: string };
export type LoginResult = { admin: false; user: { id: number; name: string; phone: string } } | { admin: true };
export type AdminSummary = { unreadNotifications: number };
export type AgendaMonth = { month: string; counts: Record<string, number>; blocked: string[]; closed?: string[] };
export type Hours = { open: string; close: string; lunchStart: string | null; lunchEnd: string | null };
export type WorkDay = Hours & { weekday: number; works: boolean };
export type DayConfig = {
  date: string;
  works: boolean;
  hours: Hours;
  weekly: Hours | null;
  custom: boolean;
  activeAppointments: number;
};
export type DayLimit = { date: string; max: number | null; used: number; remaining: number | null; before: number };
export type ConfigMonth = {
  month: string;
  closed: string[];
  custom: string[];
  limits: Record<string, { max: number; used: number; remaining: number }>;
};
export type InfoHours = { label: string; value: string };
export type ShopInfo = { hours: InfoHours[] };
export type BlockedDay = { id: number; date: string; reason: string | null };

async function request<T>(path: string, options: { method?: string; body?: unknown; admin?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.admin) {
    const token = await SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet e tente novamente.');
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
  }
  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || 'Algo deu errado. Tente novamente.');
  }
  return data as T;
}

export const api = {
  login: (name: string, phone: string) =>
    request<LoginResult>('/auth/login', { method: 'POST', body: { name, phone } }),
  services: () => request<Service[]>('/services'),
  info: () => request<ShopInfo>('/info'),
  availability: (month: string) => request<{ month: string; days: DayAvailability[] }>(`/availability?month=${month}`),
  slots: (date: string, serviceIds: number[] = []) =>
    request<{ date: string; slots: string[] }>(`/slots?date=${date}${serviceIds.length ? `&serviceIds=${serviceIds.join(',')}` : ''}`),
  book: (body: { clientName: string; phone: string; serviceIds: number[]; date: string; time: string }) =>
    request<Appointment>('/appointments', { method: 'POST', body }),
  appointments: (phone: string) => request<Appointment[]>(`/appointments?phone=${phone}`),
  cancel: (id: number, phone: string) =>
    request<Appointment>(`/appointments/${id}/cancel`, { method: 'POST', body: { phone } }),
  clearInactiveAppointments: (phone: string) =>
    request<{ ok: boolean; deleted: number }>('/appointments/clear-inactive', { method: 'POST', body: { phone } }),
  respondPresence: (id: number, phone: string, attending: boolean, reason?: string) =>
    request<Appointment>(`/appointments/${id}/presence`, { method: 'POST', body: { phone, attending, reason } }),
  registerPush: (phone: string, token: string) =>
    request<{ ok: boolean }>('/push-token', { method: 'POST', body: { phone, token } }),
  unregisterPush: (token: string) => request<{ ok: boolean }>('/push-token/remove', { method: 'POST', body: { token } }),
  notifications: (phone: string) => request<AppNotification[]>(`/notifications?phone=${phone}`),
  clearNotifications: (phone: string) =>
    request<{ ok: boolean }>('/notifications/clear', { method: 'POST', body: { phone } }),
  markNotificationsRead: (phone: string) =>
    request<{ ok: boolean }>('/notifications/read', { method: 'POST', body: { phone } }),

  admin: {
    requestCode: (phone: string, name: string, email: string) =>
      request<{ ok: boolean; message: string }>('/admin/request-code', { method: 'POST', body: { phone, name, email } }),
    verifyCode: async (phone: string, name: string, email: string, code: string) => {
      const r = await request<{ token: string; username: string }>('/admin/verify-code', {
        method: 'POST',
        body: { phone, name, email, code },
      });
      await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, r.token);
      return r;
    },
    logout: () => SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY),
    hasToken: async () => !!(await SecureStore.getItemAsync(ADMIN_TOKEN_KEY)),
    appointments: (date: string) => request<Appointment[]>(`/admin/appointments?date=${date}`, { admin: true }),
    registerPush: (token: string) => request<{ ok: boolean }>('/admin/push-token', { method: 'POST', body: { token }, admin: true }),
    unregisterPush: (token: string) =>
      request<{ ok: boolean }>('/admin/push-token/remove', { method: 'POST', body: { token }, admin: true }),
    done: () => request<Appointment[]>('/admin/appointments?status=DONE', { admin: true }),
    deleteDone: (ids: number[]) =>
      request<{ ok: boolean; deleted: number }>('/admin/appointments/done/bulk-delete', { method: 'POST', body: { ids }, admin: true }),
    deleteAllDone: () => request<{ ok: boolean; deleted: number }>('/admin/appointments/done', { method: 'DELETE', admin: true }),
    agendaMonth: (month: string) => request<AgendaMonth>(`/admin/agenda-month?month=${month}`, { admin: true }),
    cancelAppointment: (id: number) =>
      request<Appointment>(`/admin/appointments/${id}`, { method: 'PATCH', body: { status: 'CANCELED' }, admin: true }),
    summary: () => request<AdminSummary>('/admin/summary', { admin: true }),
    notifications: () => request<AppNotification[]>('/admin/notifications', { admin: true }),
    clearNotifications: () => request<{ ok: boolean }>('/admin/notifications/clear', { method: 'POST', body: {}, admin: true }),
    markNotificationsRead: () => request<{ ok: boolean }>('/admin/notifications/read', { method: 'POST', body: {}, admin: true }),
    blockedDays: () => request<BlockedDay[]>('/admin/blocked-days', { admin: true }),
    blockDay: (date: string, reason?: string) =>
      request<BlockedDay & { confirmedAppointments: number }>('/admin/blocked-days', {
        method: 'POST',
        body: { date, reason },
        admin: true,
      }),
    unblockDay: (date: string) => request<{ ok: boolean }>(`/admin/blocked-days/${date}`, { method: 'DELETE', admin: true }),
    services: () => request<Service[]>('/admin/services', { admin: true }),
    addService: (name: string) => request<Service>('/admin/services', { method: 'POST', body: { name }, admin: true }),
    updateService: (id: number, data: { name?: string; active?: boolean; durationMinutes?: number }) =>
      request<Service>(`/admin/services/${id}`, { method: 'PATCH', body: data, admin: true }),
    workHours: () => request<WorkDay[]>('/admin/work-hours', { admin: true }),
    saveWorkHours: (days: WorkDay[]) => request<WorkDay[]>('/admin/work-hours', { method: 'PUT', body: days, admin: true }),
    configMonth: (month: string) => request<ConfigMonth>(`/admin/config-month?month=${month}`, { admin: true }),
    dayConfig: (date: string) => request<DayConfig>(`/admin/day-config?date=${date}`, { admin: true }),
    saveDayConfig: (date: string, body: { works: boolean; hours?: Hours }) =>
      request<DayConfig>(`/admin/day-config/${date}`, { method: 'PUT', body, admin: true }),
    dayLimit: (date: string) => request<DayLimit>(`/admin/day-limit?date=${date}`, { admin: true }),
    saveDayLimit: (date: string, max: number) =>
      request<DayLimit>(`/admin/day-limit/${date}`, { method: 'PUT', body: { max }, admin: true }),
    removeDayLimit: (date: string) => request<DayLimit>(`/admin/day-limit/${date}`, { method: 'DELETE', admin: true }),
  },
};

export const FALLBACK_SERVICES = [
  'Design de Sobrancelhas',
  'Design de Sobrancelhas com Henna',
  'Limpeza de Pele',
  'Massagem',
  'Peeling Facial',
  'Hidratação Facial',
  'Depilação de Buço',
  'Axila',
  'Virilha',
  'Meia Perna',
  'Perna Inteira',
];

export const DEPILACAO_TYPES = ['Depilação de Buço', 'Axila', 'Virilha', 'Meia Perna', 'Perna Inteira'];
export const isDepilacao = (name: string) => DEPILACAO_TYPES.includes(name);
export const depilacaoLabel = (name: string) => name.replace(/^Depilação de /, '');
