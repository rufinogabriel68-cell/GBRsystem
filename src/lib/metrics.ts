import type { State } from "./types";
import { daysFromToday, parseDate } from "./utils";

const FATURADO = new Set(["Faturado", "Aprovado"]);

export function faturamento(s: State): number {
  return s.orc.filter((o) => FATURADO.has(o.status)).reduce((a, o) => a + o.valor, 0);
}
export function lucroOrcamentos(s: State): number {
  return s.orc.filter((o) => FATURADO.has(o.status)).reduce((a, o) => a + o.lucro, 0);
}
export function totalGastos(s: State): number {
  return s.gastos.reduce((a, g) => a + g.valor, 0);
}
export function totalRecExtras(s: State): number {
  return s.recExtras.reduce((a, r) => a + r.valor, 0);
}
export function receitaTotal(s: State): number {
  return faturamento(s) + totalRecExtras(s);
}
export function resultadoLiquido(s: State): number {
  return receitaTotal(s) - totalGastos(s);
}
export function ticketMedio(s: State): number {
  const n = s.orc.filter((o) => FATURADO.has(o.status)).length;
  return n > 0 ? faturamento(s) / n : 0;
}
export function margemPct(s: State): number {
  const f = faturamento(s);
  return f > 0 ? (resultadoLiquido(s) / f) * 100 : 0;
}
export function metaProgress(s: State): number {
  return s.cfg.metaMensal > 0 ? faturamento(s) / s.cfg.metaMensal : 0;
}
export function metaDiaria(s: State): number {
  const days = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  return s.cfg.metaMensal / days;
}
export function taxaAprovacao(s: State): number {
  const total = s.orc.length;
  if (total === 0) return 0;
  const ok = s.orc.filter((o) => FATURADO.has(o.status)).length;
  return (ok / total) * 100;
}

export function osAtivas(s: State) {
  return s.os.filter(
    (o) => o.status !== "Entregue" && o.status !== "Cancelada"
  );
}
export function osPorStatus(s: State): Record<string, number> {
  const map: Record<string, number> = {};
  for (const o of s.os) map[o.status] = (map[o.status] ?? 0) + 1;
  return map;
}
export function chamadosNaoTriados(s: State) {
  return s.os.filter((o) => o.origem === "cliente" && o.status === "Aberta");
}
export function osUrgentes(s: State) {
  return s.os.filter(
    (o) =>
      (o.prioridade === "Urgente" || o.prioridade === "Alta") &&
      o.status !== "Entregue" &&
      o.status !== "Cancelada"
  );
}

export function estoqueBaixo(s: State) {
  return s.estoque.filter((i) => i.qtd <= i.qtdMin);
}
export function estoqueValor(s: State): number {
  return s.estoque.reduce((a, i) => a + i.qtd * i.custo, 0);
}

export type GarantiaStatus = { dias: number; vencida: boolean; proxima: boolean };
export function garantiaStatus(
  dataServico: string,
  diasGarantia: number
): GarantiaStatus {
  const inicio = parseDate(dataServico);
  if (isNaN(inicio.getTime())) return { dias: 0, vencida: true, proxima: false };
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + diasGarantia);
  const dias = daysFromToday(fim.toISOString().slice(0, 10));
  return { dias, vencida: dias < 0, proxima: dias >= 0 && dias <= 7 };
}
export function garantiasVencendo(s: State) {
  return s.garantias
    .map((g) => ({ g, st: garantiaStatus(g.dataServico, g.diasGarantia) }))
    .filter((x) => x.st.proxima || x.st.vencida);
}

export function followupsPendentes(s: State) {
  return s.clientes.filter((c) =>
    c.followupStatus === "Pendente" || c.followupStatus === "Atrasado"
  );
}
export function leadsAtivos(s: State) {
  return s.leads.filter(
    (l) => l.status !== "Fechado Ganho" && l.status !== "Fechado Perdido"
  );
}
