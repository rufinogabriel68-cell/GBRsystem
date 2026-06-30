"use client";

import { useStore } from "@/lib/store";
import {
  Button,
  Card,
  Kpi,
  Progress,
  RankBar,
  SectionTitle,
  ChevronRight,
} from "@/components/ui";
import { MonthCalendar } from "@/components/MonthCalendar";
import * as M from "@/lib/metrics";
import { brl, num, pct, fmtShort, daysFromToday } from "@/lib/utils";

export function Dashboard() {
  const { state, update } = useStore();
  const s = state;
  const go = (page: string) => update((d) => { d.page = page; });

  const fat = M.faturamento(s);
  const lucro = M.resultadoLiquido(s);
  const gastos = M.totalGastos(s);
  const rec = M.totalRecExtras(s);
  const ticket = M.ticketMedio(s);
  const metaProg = M.metaProgress(s);
  const osAtivas = M.osAtivas(s);
  const chamados = M.chamadosNaoTriados(s);
  const urgentes = M.osUrgentes(s);
  const baixo = M.estoqueBaixo(s);
  const fups = M.followupsPendentes(s);
  const garantias = M.garantiasVencendo(s);
  const leads = M.leadsAtivos(s);
  const statusCounts = M.osPorStatus(s);
  const maxStatus = Math.max(1, ...Object.values(statusCounts));

  const alerts = [
    chamados.length > 0 && {
      tone: "bad" as const, icon: "🔔", title: `${chamados.length} chamado(s) não triado(s)`,
      desc: "Clientes abriram chamados online aguardando atendimento.", action: "Triar agora", page: "os",
    },
    urgentes.length > 0 && {
      tone: "bad" as const, icon: "⚡", title: `${urgentes.length} OS prioritária(s)`,
      desc: "Ordens urgentes/altas que ainda estão em andamento.", action: "Ver ordens", page: "os",
    },
    baixo.length > 0 && {
      tone: "warn" as const, icon: "📦", title: `${baixo.length} item(ns) de estoque baixo`,
      desc: baixo.map((b) => b.nome).slice(0, 2).join(", ") + (baixo.length > 2 ? "…" : ""),
      action: "Ver estoque", page: "estoque",
    },
    fups.length > 0 && {
      tone: "warn" as const, icon: "📞", title: `${fups.length} follow-up(s) pendente(s)`,
      desc: "Clientes aguardando retorno de contato.", action: "Ir para CRM", page: "crm",
    },
    garantias.length > 0 && {
      tone: "warn" as const, icon: "🛡️", title: `${garantias.length} garantia(s) vencendo`,
      desc: "Garantias próximas do vencimento ou expiradas.", action: "Ver garantias", page: "crm",
    },
  ].filter(Boolean) as {
    tone: "bad" | "warn"; icon: string; title: string; desc: string; action: string; page: string;
  }[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 fade-up">
      <div>
        <h2 className="font-display text-2xl font-extrabold text-ink">
          Olá! 👋
        </h2>
        <p className="text-sm text-muted">
          {s.cfg.empresa} • Resumo operacional de hoje
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Faturamento" value={brl(fat)} tone="good" icon="💰" sub={`${s.orc.filter(o=>o.status==="Faturado"||o.status==="Aprovado").length} orç. aprovados`} />
        <Kpi label="Lucro Líquido" value={brl(lucro)} tone={lucro >= 0 ? "good" : "bad"} icon="📈" sub={`Margem ${pct(M.margemPct(s))}`} />
        <Kpi label="Ticket Médio" value={brl(ticket)} tone="accent" icon="🧾" />
        <Kpi label="Clientes" value={num(s.clientes.length)} tone="info" icon="👥" />
        <Kpi label="Leads Ativos" value={num(leads.length)} tone="warn" icon="🎯" />
        <Kpi label="OS em aberto" value={num(osAtivas.length)} tone="accent" icon="🛠️" />
      </div>

      {/* Meta */}
      <Card glow className="p-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">
              Progresso da meta mensal
            </div>
            <div className="mt-1 font-display text-2xl font-bold">
              {brl(fat)}{" "}
              <span className="text-sm font-normal text-muted">
                / {brl(s.cfg.metaMensal)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-extrabold text-gradient">
              {pct(metaProg * 100, 0)}
            </div>
            <div className="text-xs text-muted">da meta</div>
          </div>
        </div>
        <Progress value={fat} max={s.cfg.metaMensal} className="h-3" />
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>Faltam {brl(Math.max(0, s.cfg.metaMensal - fat))}</span>
          <span>Meta diária: {brl(M.metaDiaria(s))}</span>
        </div>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <AlertBanner key={i} {...a} onClick={() => go(a.page)} />
          ))}
        </div>
      )}

      {/* Charts + lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card glow className="p-5">
          <SectionTitle sub="Distribuição das ordens de serviço">
            Situação das OS
          </SectionTitle>
          <div className="space-y-2.5">
            {Object.entries(statusCounts).length === 0 && (
              <p className="text-sm text-muted">Nenhuma OS registrada.</p>
            )}
            {Object.entries(statusCounts).map(([st, count]) => (
              <RankBar
                key={st}
                label={st}
                value={count}
                max={maxStatus}
                right={`${count}`}
                color={statusColor(st)}
              />
            ))}
          </div>
        </Card>

        <Card glow className="p-5">
          <SectionTitle
            action={
              <Button variant="ghost" size="sm" onClick={() => go("crm")}>
                Ver tudo
              </Button>
            }
          >
            Follow-ups pendentes
          </SectionTitle>
          <div className="space-y-2">
            {fups.length === 0 && (
              <p className="text-sm text-muted">Nenhum follow-up pendente. 🎉</p>
            )}
            {fups.slice(0, 5).map((c) => {
              const dias = daysFromToday(c.followupData);
              const atrasado = c.followupStatus === "Atrasado" || dias < 0;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${atrasado ? "bg-bad" : "bg-warn"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">
                      {c.nome}
                    </div>
                    <div className="text-xs text-muted">{c.tel}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className={atrasado ? "text-bad" : "text-muted"}>
                      {fmtShort(c.followupData)}
                    </div>
                    <div className="text-muted">
                      {atrasado ? "atrasado" : `${dias}d`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Garantias + análise */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card glow className="p-5">
          <SectionTitle sub="Próximas do vencimento">Garantias</SectionTitle>
          <div className="space-y-2">
            {garantias.length === 0 && (
              <p className="text-sm text-muted">Tudo em dia. 🛡️</p>
            )}
            {garantias.slice(0, 5).map(({ g, st }) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2"
              >
                <span className="text-lg">{st.vencida ? "⛔" : "🛡️"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {g.cliente}
                  </div>
                  <div className="truncate text-xs text-muted">{g.servico}</div>
                </div>
                <span
                  className={`text-xs font-semibold ${st.vencida ? "text-bad" : "text-warn"}`}
                >
                  {st.vencida ? "vencida" : `${st.dias}d`}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card glow className="p-5">
          <SectionTitle sub="Indicadores rápidos">Análise rápida</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Taxa de aprovação" value={pct(M.taxaAprovacao(s))} tone="good" />
            <MiniStat label="Margem líquida" value={pct(M.margemPct(s))} tone="accent" />
            <MiniStat label="Total de gastos" value={brl(gastos)} tone="bad" />
            <MiniStat label="Receitas extras" value={brl(rec)} tone="info" />
            <MiniStat label="Valor em estoque" value={brl(M.estoqueValor(s))} tone="info" />
            <MiniStat label="Meta diária" value={brl(M.metaDiaria(s))} tone="warn" />
          </div>
        </Card>
      </div>

      {/* Calendar */}
      <Card glow className="p-5">
        <SectionTitle sub="Compromissos do mês" action={<Button variant="ghost" size="sm" onClick={() => go("agenda")}>Abrir agenda</Button>}>
          Calendário
        </SectionTitle>
        <MonthCalendar events={s.agenda.map((a) => ({ dia: a.dia, tipo: a.tipo }))} />
      </Card>
    </div>
  );
}

function AlertBanner({
  tone,
  icon,
  title,
  desc,
  action,
  onClick,
}: {
  tone: "bad" | "warn";
  icon: string;
  title: string;
  desc: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: `var(--color-${tone})44`,
        background: `var(--color-${tone})14`,
      }}
    >
      <span className="text-xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: `var(--color-${tone})` }}>
          {title}
        </div>
        <div className="truncate text-xs text-muted">{desc}</div>
      </div>
      <Button size="sm" variant={tone === "bad" ? "danger" : "subtle"} onClick={onClick}>
        {action}
        <ChevronRight />
      </Button>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "warn" | "info" | "accent";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div
        className="mt-1 font-display text-lg font-bold"
        style={{ color: `var(--color-${tone})` }}
      >
        {value}
      </div>
    </div>
  );
}

function statusColor(st: string): string {
  const map: Record<string, string> = {
    Aberta: "#38bdf8",
    Diagnóstico: "#a78bfa",
    "Em Execução": "#7c4dff",
    "Aguardando Peça": "#ffb020",
    Concluída: "#2ecc71",
    Entregue: "#22d3ee",
    Cancelada: "#ff5470",
  };
  return map[st] ?? "#9b95c0";
}
