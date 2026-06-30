"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Tabs,
  Kpi,
  Progress,
  RankBar,
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  SectionTitle,
} from "@/components/ui";
import * as M from "@/lib/metrics";
import { brl, pct, fmtDate, uid } from "@/lib/utils";
import type { Gasto, RecExtra } from "@/lib/types";

const GASTO_CATS = ["Materiais", "Transporte", "Marketing", "Impostos", "Ferramentas", "Operacional", "Outros"];
const REC_CATS = ["Consultoria", "Indicações", "Manutenção recorrente", "Venda de peças", "Outros"];

export function Finance() {
  const { state, update } = useStore();
  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      <Tabs
        active={state.finTab}
        onChange={(id) => update((d) => { d.finTab = id; })}
        tabs={[
          { id: "geral", label: "Visão geral" },
          { id: "receitas", label: "Receitas", count: state.recExtras.length },
          { id: "gastos", label: "Gastos", count: state.gastos.length },
        ]}
      />
      {state.finTab === "geral" && <Overview />}
      {state.finTab === "receitas" && <Receitas />}
      {state.finTab === "gastos" && <Gastos />}
    </div>
  );
}

function Overview() {
  const { state } = useStore();
  const s = state;
  const fat = M.faturamento(s);
  const rec = M.totalRecExtras(s);
  const gastos = M.totalGastos(s);
  const bruto = fat + rec;
  const liquido = bruto - gastos;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Faturamento" value={brl(fat)} tone="good" icon="💰" />
        <Kpi label="Receitas extras" value={brl(rec)} tone="info" icon="➕" />
        <Kpi label="Total bruto" value={brl(bruto)} tone="accent" icon="📊" />
        <Kpi label="Total gastos" value={brl(gastos)} tone="bad" icon="📉" />
        <Kpi label="Resultado líquido" value={brl(liquido)} tone={liquido >= 0 ? "good" : "bad"} icon={liquido >= 0 ? "📈" : "⚠️"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card glow className="p-5">
          <SectionTitle sub={`Meta mensal: ${brl(s.cfg.metaMensal)}`}>Progresso da meta</SectionTitle>
          <div className="mb-2 flex items-end justify-between">
            <span className="font-display text-2xl font-bold">{brl(fat)}</span>
            <span className="text-gradient font-display text-xl font-extrabold">{pct(M.metaProgress(s) * 100)}</span>
          </div>
          <Progress value={fat} max={s.cfg.metaMensal} className="h-3" />
          <div className="mt-2 flex justify-between text-xs text-muted"><span>Faltam {brl(Math.max(0, s.cfg.metaMensal - fat))}</span><span>{pct(M.margemPct(s))} de margem</span></div>
        </Card>

        <Card glow className="p-5">
          <SectionTitle sub="Indicadores">Resumo</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <MiniCard label="Margem bruta" value={pct(M.margemPct(s))} tone="accent" />
            <MiniCard label="Resultado" value={brl(liquido)} tone={liquido >= 0 ? "good" : "bad"} />
            <MiniCard label="Meta diária" value={brl(M.metaDiaria(s))} tone="warn" />
            <MiniCard label="Meta semanal" value={brl(s.cfg.metaSemanal)} tone="info" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Gastos() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState(0);
  const [cat, setCat] = useState(GASTO_CATS[0]);

  const total = M.totalGastos(state);
  const byCat: Record<string, number> = {};
  for (const g of state.gastos) byCat[g.cat] = (byCat[g.cat] ?? 0) + g.valor;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const colors = ["#7c4dff", "#c840e0", "#38bdf8", "#2ecc71", "#ffb020", "#ff5470", "#22d3ee"];

  function add() {
    if (!desc.trim() || valor <= 0) { toast.push("Preencha descrição e valor.", "error"); return; }
    update((d) => { d.gastos.unshift({ id: uid(), desc, valor, cat, data: new Date().toISOString().slice(0, 10) }); d.nextGasto += 1; });
    toast.push("Gasto registrado.");
    setOpen(false); setDesc(""); setValor(0); setCat(GASTO_CATS[0]);
  }
  async function remove(g: Gasto) {
    if (await confirm(`Excluir gasto "${g.desc}"?`)) {
      update((d) => { d.gastos = d.gastos.filter((x) => x.id !== g.id); });
      toast.push("Gasto excluído.", "info");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><div className="text-xs uppercase text-muted">Total de gastos</div><div className="font-display text-2xl font-bold text-bad">{brl(total)}</div></div>
        <Button onClick={() => setOpen(true)}><PlusIcon /> Registrar gasto</Button>
      </div>

      {cats.length > 0 && (
        <Card glow className="p-5">
          <SectionTitle sub="Distribuição por categoria">Onde o dinheiro vai</SectionTitle>
          <div className="space-y-2.5">
            {cats.map(([c, v], i) => (
              <RankBar key={c} label={c} value={v} max={total} color={colors[i % colors.length]} right={`${brl(v)} • ${pct((v / total) * 100)}`} />
            ))}
          </div>
        </Card>
      )}

      {state.gastos.length === 0 ? (
        <EmptyState emoji="💸" title="Nenhum gasto" desc="Registre seus gastos para acompanhar a saúde financeira." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Data</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>
              {state.gastos.map((g) => (
                <tr key={g.id} className="border-b border-line/60 last:border-0"><td className="px-4 py-2.5 font-medium text-ink">{g.desc}</td><td className="px-4 py-2.5"><Badge tone="neutral">{g.cat}</Badge></td><td className="px-4 py-2.5 text-muted">{fmtDate(g.data)}</td><td className="px-4 py-2.5 text-right font-semibold text-bad">{brl(g.valor)}</td><td className="px-4 py-2.5 text-right"><Button size="icon" variant="ghost" onClick={() => remove(g)}><TrashIcon /></Button></td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar gasto" size="sm" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={add}>Registrar</Button></>}>
        <div className="space-y-3">
          <Field label="Descrição"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Compra de peças" /></Field>
          <Field label="Categoria"><Select value={cat} onChange={(e) => setCat(e.target.value)}>{GASTO_CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Valor (R$)"><Input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(parseFloat(e.target.value) || 0)} /></Field>
        </div>
      </Modal>
      {node}
    </div>
  );
}

function Receitas() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState(0);
  const [cat, setCat] = useState(REC_CATS[0]);
  const total = M.totalRecExtras(state);

  function add() {
    if (!desc.trim() || valor <= 0) { toast.push("Preencha descrição e valor.", "error"); return; }
    update((d) => { d.recExtras.unshift({ id: uid(), desc, valor, cat, data: new Date().toISOString().slice(0, 10) }); d.nextRecExtra += 1; });
    toast.push("Receita registrada.");
    setOpen(false); setDesc(""); setValor(0); setCat(REC_CATS[0]);
  }
  async function remove(r: RecExtra) {
    if (await confirm(`Excluir receita "${r.desc}"?`)) {
      update((d) => { d.recExtras = d.recExtras.filter((x) => x.id !== r.id); });
      toast.push("Receita excluída.", "info");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><div className="text-xs uppercase text-muted">Total de receitas extras</div><div className="font-display text-2xl font-bold text-good">{brl(total)}</div></div>
        <Button onClick={() => setOpen(true)}><PlusIcon /> Registrar receita</Button>
      </div>
      {state.recExtras.length === 0 ? (
        <EmptyState emoji="💵" title="Nenhuma receita extra" desc="Registreceitas de consultoria, indicações, etc." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {state.recExtras.map((r) => (
            <Card key={r.id} glow className="flex items-center justify-between p-4">
              <div><div className="font-semibold text-ink">{r.desc}</div><div className="text-xs text-muted">{r.cat} • {fmtDate(r.data)}</div></div>
              <div className="flex items-center gap-2"><span className="font-display font-bold text-good">{brl(r.valor)}</span><Button size="icon" variant="ghost" onClick={() => remove(r)}><TrashIcon /></Button></div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar receita" size="sm" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={add}>Registrar</Button></>}>
        <div className="space-y-3">
          <Field label="Descrição"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Consultoria técnica" /></Field>
          <Field label="Categoria"><Select value={cat} onChange={(e) => setCat(e.target.value)}>{REC_CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Valor (R$)"><Input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(parseFloat(e.target.value) || 0)} /></Field>
        </div>
      </Modal>
      {node}
    </div>
  );
}

function MiniCard({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "warn" | "info" | "accent" }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-display text-lg font-bold" style={{ color: `var(--color-${tone})` }}>{value}</div>
    </div>
  );
}
