export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function brl(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(isFinite(n) ? n : 0);
}

export function num(n: number, digits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(isFinite(n) ? n : 0);
}

export function pct(n: number, digits = 0): string {
  return `${num(n, digits)}%`;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function parseDate(s: string): Date {
  if (!s) return new Date(NaN);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  const d = new Date();
  return toISO(d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDate(s: string): string {
  const d = parseDate(s);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function fmtShort(s: string): string {
  const d = parseDate(s);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate().toString().padStart(2, "0")} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function daysBetween(a: string, b: string): number {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function daysFromToday(s: string): number {
  return daysBetween(todayISO(), s);
}

export function weekdayShort(s: string): string {
  const d = parseDate(s);
  if (isNaN(d.getTime())) return "";
  return WEEKDAYS[d.getDay()];
}

export function monthName(m: number): string {
  return MONTHS[m] ?? "";
}

export function weekdayName(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic color from a string (for avatars)
const AVATAR_COLORS = [
  "#7c4dff", "#c840e0", "#38bdf8", "#2ecc71",
  "#ffb020", "#ff5470", "#22d3ee", "#a78bfa",
];
export function colorFromString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
