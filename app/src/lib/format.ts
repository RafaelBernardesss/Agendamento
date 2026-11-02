export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const pad = (n: number) => String(n).padStart(2, '0');

export function maskPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function phoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

export function isPhoneComplete(input: string): boolean {
  const d = phoneDigits(input);
  return d.length === 10 || (d.length === 11 && d[2] === '9');
}

export function toDateStr(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function parseDateStr(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m: m - 1, d };
}

export function formatDateBR(s: string): string {
  const { y, m, d } = parseDateStr(s);
  return `${pad(d)}/${pad(m + 1)}/${y}`;
}

export function formatDateLong(s: string): string {
  const { y, m, d } = parseDateStr(s);
  const wd = new Date(Date.UTC(y, m, d)).getUTCDay();
  return `${WEEKDAYS_LONG[wd]}, ${d} de ${MONTHS[m]}`;
}

export function weekdayOf(s: string): number {
  const { y, m, d } = parseDateStr(s);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function todayStr(now: Date = new Date()): string {
  const sp = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return toDateStr(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate());
}

export function addDays(dateStr: string, delta: number): string {
  const { y, m, d } = parseDateStr(dateStr);
  const dt = new Date(Date.UTC(y, m, d + delta));
  return toDateStr(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
}

export function formatNotificationDate(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const sp = new Date(dt.getTime() - 3 * 60 * 60 * 1000);
  return `${pad(sp.getUTCDate())}/${pad(sp.getUTCMonth() + 1)} às ${pad(sp.getUTCHours())}:${pad(sp.getUTCMinutes())}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function validateHours(h: { open: string; close: string; lunchStart: string | null; lunchEnd: string | null }): string | null {
  if (timeToMinutes(h.open) >= timeToMinutes(h.close)) return 'A saída precisa ser depois da entrada.';
  if (h.lunchStart !== null && h.lunchEnd !== null) {
    if (timeToMinutes(h.lunchStart) >= timeToMinutes(h.lunchEnd)) return 'O almoço precisa terminar depois de começar.';
    if (timeToMinutes(h.lunchStart) < timeToMinutes(h.open) || timeToMinutes(h.lunchEnd) > timeToMinutes(h.close)) {
      return 'O almoço precisa estar dentro do horário de trabalho.';
    }
  }
  return null;
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const { y, m, d } = parseDateStr(s);
  const dt = new Date(Date.UTC(y, m, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m && dt.getUTCDate() === d;
}
