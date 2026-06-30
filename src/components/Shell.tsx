"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button, type Tone, CloseIcon } from "@/components/ui";

import { Dashboard } from "./modules/Dashboard";
import { Services } from "./modules/Services";
import { Calculator } from "./modules/Calculator";
import { Quotes } from "./modules/Quotes";
import { ServiceOrders } from "./modules/ServiceOrders";
import { CRM } from "./modules/CRM";
import { Inventory } from "./modules/Inventory";
import { Agenda } from "./modules/Agenda";
import { Finance } from "./modules/Finance";
import { Notes } from "./modules/Notes";
import { PdfGenerator } from "./modules/PdfGenerator";
import { Settings } from "./modules/Settings";

export type NavItem = { id: string; label: string; icon: string };

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "🖥️" },
  { id: "services", label: "Serviços", icon: "🔧" },
  { id: "calc", label: "Calculadora", icon: "🧮" },
  { id: "orc", label: "Orçamentos", icon: "📋" },
  { id: "os", label: "Ordens", icon: "🛠️" },
  { id: "crm", label: "CRM", icon: "👥" },
  { id: "estoque", label: "Estoque", icon: "📦" },
  { id: "agenda", label: "Agenda", icon: "📅" },
  { id: "financeiro", label: "Financeiro", icon: "💰" },
  { id: "notas", label: "Notas", icon: "📝" },
  { id: "pdf", label: "Documentos", icon: "📄" },
  { id: "config", label: "Configurações", icon: "⚙️" },
];

const QUICK = ["dashboard", "os", "orc", "crm", "financeiro"];

const SYNC_MAP: Record<string, { tone: Tone; label: string }> = {
  loading: { tone: "info", label: "Carregando..." },
  saving: { tone: "warn", label: "Salvando..." },
  saved: { tone: "good", label: "Tudo sincronizado" },
  offline: { tone: "bad", label: "Modo offline (local)" },
  error: { tone: "bad", label: "Erro ao salvar" },
};

function useModule() {
  const { state } = useStore();
  switch (state.page) {
    case "dashboard":
      return <Dashboard />;
    case "services":
      return <Services />;
    case "calc":
      return <Calculator />;
    case "orc":
      return <Quotes />;
    case "os":
      return <ServiceOrders />;
    case "crm":
      return <CRM />;
    case "estoque":
      return <Inventory />;
    case "agenda":
      return <Agenda />;
    case "financeiro":
      return <Finance />;
    case "notas":
      return <Notes />;
    case "pdf":
      return <PdfGenerator />;
    case "config":
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

function SyncStatus() {
  const { saveStatus } = useStore();
  const s = SYNC_MAP[saveStatus] ?? SYNC_MAP.saved;
  const pulse = saveStatus === "saving" || saveStatus === "loading";
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          pulse && "dot-pulse"
        )}
        style={{ background: `var(--color-${s.tone === "good" ? "good" : s.tone === "warn" ? "warn" : s.tone === "bad" ? "bad" : "info"})` }}
      />
      <span className="text-xs text-muted">{s.label}</span>
    </div>
  );
}

export function Shell() {
  const { state, update, user } = useStore();
  const [drawer, setDrawer] = useState(false);
  const module = useModule();

  const setPage = (id: string) => {
    update((d) => {
      d.page = id;
    });
    setDrawer(false);
  };

  const current = NAV.find((n) => n.id === state.page);

  // Lock scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <div className="flex min-h-screen bg-base">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-lg shadow-lg shadow-accent/30">
            🖥️
          </div>
          <div>
            <div className="font-display text-sm font-extrabold leading-none">
              <span className="text-gradient">GBR OS</span>
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{state.cfg.empresa}</div>
          </div>
        </div>

        <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                state.page === item.id
                  ? "border border-accent/40 bg-accent/15 text-ink"
                  : "text-muted hover:bg-surface2 hover:text-ink"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-2 border-t border-line p-3">
          <SyncStatus />
          <div className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-accent text-xs font-bold text-white">
              {(user?.name ?? "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-ink">
                {user?.name}
              </div>
              <div className="truncate text-[10px] text-muted">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-base/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-ink md:hidden"
              onClick={() => setDrawer(true)}
              aria-label="Menu"
            >
              <MenuIcon />
            </button>
            <div className="text-xl">{current?.icon}</div>
            <div>
              <h1 className="font-display text-base font-bold leading-none text-ink md:text-lg">
                {current?.label}
              </h1>
            </div>
          </div>
          <div className="hidden md:block">
            <SyncStatus />
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-8">{module}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-surface/95 px-2 py-1.5 backdrop-blur md:hidden">
        {QUICK.map((id) => {
          const item = NAV.find((n) => n.id === id)!;
          const active = state.page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition",
                active ? "text-accent" : "text-muted"
              )}
            >
              <span className={cn("text-lg", active && "scale-110")} style={{ filter: active ? "drop-shadow(0 0 6px rgba(124,77,255,.6))" : undefined }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
        <button
          onClick={() => setDrawer(true)}
          className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium text-muted"
        >
          <span className="text-lg">⚙️</span>
          Mais
        </button>
      </nav>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-base/80 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="pop-in absolute inset-y-0 left-0 flex w-[280px] max-w-[82%] flex-col border-r border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-lg">
                  🖥️
                </div>
                <span className="font-display text-sm font-extrabold text-gradient">
                  GBR OS
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrawer(false)}>
                <CloseIcon />
              </Button>
            </div>
            <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    state.page === item.id
                      ? "border border-accent/40 bg-accent/15 text-ink"
                      : "text-muted hover:bg-surface2 hover:text-ink"
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="space-y-2 border-t border-line p-3">
              <div className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-accent text-xs font-bold text-white">
                  {(user?.name ?? "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-ink">
                    {user?.name}
                  </div>
                  <div className="truncate text-[10px] text-muted">{user?.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}
