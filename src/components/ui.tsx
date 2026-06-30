"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn, uid } from "@/lib/utils";

/* ---------------- Toasts ---------------- */
type ToastTone = "success" | "error" | "info";
type Toast = { id: string; msg: string; tone: ToastTone };
const ToastCtx = createContext<{ push: (msg: string, tone?: ToastTone) => void }>({
  push: () => {},
});
export function useToast() {
  return useContext(ToastCtx);
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, tone: ToastTone = "success") => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[120] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pop-in pointer-events-auto rounded-xl border px-4 py-2.5 text-sm font-medium shadow-2xl backdrop-blur",
              t.tone === "success" && "border-good/40 bg-good/15 text-good",
              t.tone === "error" && "border-bad/40 bg-bad/15 text-bad",
              t.tone === "info" && "border-info/40 bg-info/15 text-info"
            )}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- Inputs ---------------- */
export const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/30";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "resize-y", props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(inputCls, "appearance-none bg-[length:0]", props.className)}
    />
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/* ---------------- Button ---------------- */
type Variant = "primary" | "ghost" | "danger" | "subtle" | "outline";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "icon";
};
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-3 py-1.5",
        size === "md" && "px-4 py-2.5",
        size === "icon" && "h-9 w-9 p-0",
        variant === "primary" &&
          "bg-gradient-accent text-white shadow-lg shadow-accent/25 hover:brightness-110",
        variant === "subtle" &&
          "border border-line bg-surface2 text-ink hover:border-accent/50 hover:bg-surface3",
        variant === "outline" &&
          "border border-accent/40 text-accent hover:bg-accent/10",
        variant === "ghost" && "text-muted hover:bg-surface2 hover:text-ink",
        variant === "danger" &&
          "border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  className,
  children,
  glow,
}: {
  className?: string;
  children: ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface",
        glow && "card-glow",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  sub,
  action,
}: {
  children: ReactNode;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">{children}</h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "accent";
export const toneColor: Record<Tone, string> = {
  neutral: "#9b95c0",
  good: "#2ecc71",
  warn: "#ffb020",
  bad: "#ff5470",
  info: "#38bdf8",
  accent: "#a78bfa",
};
export function Badge({
  tone = "neutral",
  children,
  dot,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        color: toneColor[tone],
        borderColor: `${toneColor[tone]}55`,
        background: `${toneColor[tone]}1a`,
      }}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: toneColor[tone] }}
        />
      )}
      {children}
    </span>
  );
}
export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: toneColor[tone] }}
    />
  );
}

/* ---------------- KPI ---------------- */
export function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <Card glow className="p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
        {icon && (
          <span
            className="grid h-8 w-8 place-items-center rounded-lg text-base"
            style={{ background: `${toneColor[tone]}1a` }}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className="mt-2 font-display text-2xl font-bold"
        style={{ color: tone !== "neutral" ? toneColor[tone] : undefined }}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

/* ---------------- Progress ---------------- */
export function Progress({
  value,
  max = 100,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
}) {
  const pctV = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-surface3", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pctV}%`,
          background:
            tone === "accent"
              ? "linear-gradient(90deg,#7c4dff,#c840e0)"
              : toneColor[tone],
        }}
      />
    </div>
  );
}

/* ---------------- Rank Bar ---------------- */
export function RankBar({
  label,
  value,
  max,
  color = "#7c4dff",
  right,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  right?: ReactNode;
}) {
  const pctV = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">{right}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pctV}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ---------------- Empty State ---------------- */
export function EmptyState({
  emoji = "📭",
  title,
  desc,
  action,
}: {
  emoji?: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{emoji}</div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------- Stars ---------------- */
export function Stars({
  value,
  onChange,
  size = "text-sm",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", size)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(onChange && "cursor-pointer hover:scale-110", "transition")}
        >
          <span className={n <= value ? "text-warn" : "text-line"}>★</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-xl border border-line bg-surface p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
            active === t.id
              ? "bg-gradient-accent text-white shadow"
              : "text-muted hover:bg-surface2 hover:text-ink"
          )}
        >
          {t.label}
          {typeof t.count === "number" && (
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                active === t.id ? "bg-white/20" : "bg-surface3"
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-base/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "pop-in relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface2 shadow-2xl sm:rounded-2xl",
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="font-display text-base font-bold text-ink">{title}</h3>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
              <CloseIcon />
            </Button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Confirm ---------------- */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    msg: string;
    resolve?: (v: boolean) => void;
  }>({ open: false, msg: "" });

  const confirm = useCallback((msg: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, msg, resolve });
    });
  }, []);

  const node = (
    <Modal
      open={state.open}
      onClose={() => {
        state.resolve?.(false);
        setState({ open: false, msg: "" });
      }}
      title="Confirmar ação"
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              state.resolve?.(false);
              setState({ open: false, msg: "" });
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              state.resolve?.(true);
              setState({ open: false, msg: "" });
            }}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{state.msg}</p>
    </Modal>
  );

  return { confirm, node };
}

/* ---------------- Search ---------------- */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
        <SearchIcon />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, "pl-9")}
      />
    </div>
  );
}

/* ---------------- Chip ---------------- */
export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-accent/60 bg-accent/15 text-ink"
          : "border-line bg-surface2 text-muted hover:border-accent/40 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

/* ---------------- Icons (inline SVG) ---------------- */
export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
export function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
export function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
export function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
export function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
