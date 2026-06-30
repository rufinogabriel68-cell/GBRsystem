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
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  EditIcon,
  Kpi,
  type Tone,
} from "@/components/ui";
import { brl, fmtDate, uid } from "@/lib/utils";
import type { Estoque, MovEstoque } from "@/lib/types";

function statusOf(i: Estoque): { tone: Tone; label: string } {
  if (i.qtd <= 0) return { tone: "bad", label: "ZERO" };
  if (i.qtd <= i.qtdMin) return { tone: "warn", label: "Baixo" };
  return { tone: "good", label: "OK" };
}

function emptyItem(): Estoque {
  return { id: uid(), nome: "", cat: "Elétrica", qtd: 0, qtdMin: 1, unidade: "un", custo: 0, local: "", fornecedor: "", obs: "" };
}

export function Inventory() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<Estoque | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [balanco, setBalanco] = useState(false);
  const [moveItem, setMoveItem] = useState<{ item: Estoque; tipo: "Entrada" | "Saída" } | null>(null);
  const [moveQty, setMoveQty] = useState(1);
  const [moveObs, setMoveObs] = useState("");

  const baixo = state.estoque.filter((i) => i.qtd <= i.qtdMin);
  const valorTotal = state.estoque.reduce((a, i) => a + i.qtd * i.custo, 0);

  function save() {
    if (!editing) return;
    if (!editing.nome.trim()) { toast.push("Informe o nome.", "error"); return; }
    const it = editing;
    update((d) => {
      const idx = d.estoque.findIndex((x) => x.id === it.id);
      if (idx >= 0) d.estoque[idx] = it; else { d.estoque.unshift(it); d.nextEst += 1; }
    });
    toast.push(isNew ? "Item criado." : "Item atualizado.");
    setEditing(null);
  }
  async function remove(it: Estoque) {
    if (await confirm(`Excluir "${it.nome}" do estoque?`)) {
      update((d) => { d.estoque = d.estoque.filter((x) => x.id !== it.id); });
      toast.push("Item excluído.", "info");
    }
  }
  function quickMove() {
    if (!moveItem) return;
    const { item, tipo } = moveItem;
    const delta = tipo === "Entrada" ? moveQty : -moveQty;
    update((d) => {
      const t = d.estoque.find((x) => x.id === item.id);
      if (t) t.qtd = Math.max(0, t.qtd + delta);
      d.movEstoque.unshift({ data: new Date().toISOString().slice(0, 10), item: item.nome, tipo, qtd: moveQty, unidade: item.unidade, obs: moveObs });
    });
    toast.push(`${tipo} registrada.`);
    setMoveItem(null); setMoveQty(1); setMoveObs("");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      {baixo.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3">
          <span className="text-xl">📦</span>
          <div className="flex-1"><div className="text-sm font-semibold text-warn">{baixo.length} item(ns) com estoque baixo</div><div className="text-xs text-muted">{baixo.map((b) => b.nome).slice(0, 3).join(", ")}</div></div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Itens" value={state.estoque.length} tone="accent" icon="📦" />
        <Kpi label="Valor total" value={brl(valorTotal)} tone="good" icon="💰" />
        <Kpi label="Estoque baixo" value={baixo.length} tone="warn" icon="⚠️" />
        <Kpi label="Em falta" value={state.estoque.filter((i) => i.qtd <= 0).length} tone="bad" icon="⛔" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs active={state.estTab} onChange={(id) => update((d) => { d.estTab = id; })} tabs={[{ id: "itens", label: "Itens", count: state.estoque.length }, { id: "mov", label: "Movimentações", count: state.movEstoque.length }]} />
        <div className="flex gap-2">
          <Button variant="subtle" onClick={() => setBalanco(true)}>📊 Balanço</Button>
          {state.estTab === "itens" && <Button onClick={() => { setEditing(emptyItem()); setIsNew(true); }}><PlusIcon /> Novo item</Button>}
        </div>
      </div>

      {state.estTab === "itens" ? (
        state.estoque.length === 0 ? (
          <EmptyState emoji="📦" title="Estoque vazio" desc="Cadastre seus materiais para controlar quantidades e custos." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {state.estoque.map((it) => {
              const st = statusOf(it);
              return (
                <Card key={it.id} glow className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0"><h3 className="truncate font-semibold text-ink">{it.nome}</h3><div className="text-xs text-muted">{it.cat} • {it.local || "sem local"}</div></div>
                    <Badge tone={st.tone} dot>{st.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="font-display text-2xl font-bold" style={{ color: `var(--color-${st.tone})` }}>{it.qtd}</div>
                      <div className="text-xs text-muted">{it.unidade} • mín {it.qtdMin}</div>
                    </div>
                    <div className="text-right"><div className="text-sm font-semibold">{brl(it.qtd * it.custo)}</div><div className="text-xs text-muted">{brl(it.custo)}/{it.unidade}</div></div>
                  </div>
                  <div className="mt-3 flex gap-1.5 border-t border-line pt-3">
                    <Button size="sm" variant="subtle" className="flex-1" onClick={() => { setMoveItem({ item: it, tipo: "Entrada" }); setMoveQty(1); }}>+ Entrada</Button>
                    <Button size="sm" variant="subtle" className="flex-1" onClick={() => { setMoveItem({ item: it, tipo: "Saída" }); setMoveQty(1); }}>− Saída</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...it }); setIsNew(false); }}><EditIcon /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(it)}><TrashIcon /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card className="overflow-hidden">
          {state.movEstoque.length === 0 ? <div className="p-6"><EmptyState emoji="🔄" title="Sem movimentações" /></div> : (
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3">Obs</th></tr></thead>
              <tbody>
                {state.movEstoque.map((m, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0"><td className="px-4 py-2.5 text-muted">{fmtDate(m.data)}</td><td className="px-4 py-2.5 font-medium text-ink">{m.item}</td><td className="px-4 py-2.5"><Badge tone={m.tipo === "Entrada" ? "good" : "bad"}>{m.tipo}</Badge></td><td className="px-4 py-2.5 text-right">{m.qtd} {m.unidade}</td><td className="px-4 py-2.5 text-muted">{m.obs}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Move modal */}
      <Modal open={!!moveItem} onClose={() => setMoveItem(null)} title={moveItem ? `${moveItem.tipo} — ${moveItem.item.nome}` : ""} size="sm"
        footer={<><Button variant="ghost" onClick={() => setMoveItem(null)}>Cancelar</Button><Button onClick={quickMove}>Registrar</Button></>}>
        {moveItem && (
          <div className="space-y-3">
            <div className="text-sm text-muted">Estoque atual: <span className="font-bold text-ink">{moveItem.item.qtd} {moveItem.item.unidade}</span></div>
            <NumField label={`Quantidade (${moveItem.item.unidade})`} value={moveQty} onChange={setMoveQty} />
            <Field label="Observação / vínculo (OS)"><Input value={moveObs} onChange={(e) => setMoveObs(e.target.value)} placeholder="Ex.: OS-0001" /></Field>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Novo item" : "Editar item"} size="md"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Nome"><Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></Field></div>
            <Field label="Categoria"><Select value={editing.cat} onChange={(e) => setEditing({ ...editing, cat: e.target.value })}>{state.categorias.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <Field label="Unidade"><Select value={editing.unidade} onChange={(e) => setEditing({ ...editing, unidade: e.target.value })}>{["un", "kg", "m", "l", "cx"].map((u) => <option key={u}>{u}</option>)}</Select></Field>
            <NumField label="Quantidade" value={editing.qtd} onChange={(v) => setEditing({ ...editing, qtd: v })} />
            <NumField label="Qtd mínima" value={editing.qtdMin} onChange={(v) => setEditing({ ...editing, qtdMin: v })} />
            <NumField label="Custo unitário" value={editing.custo} onChange={(v) => setEditing({ ...editing, custo: v })} />
            <Field label="Local"><Input value={editing.local} onChange={(e) => setEditing({ ...editing, local: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Fornecedor"><Input value={editing.fornecedor} onChange={(e) => setEditing({ ...editing, fornecedor: e.target.value })} /></Field></div>
          </div>
        )}
      </Modal>

      {/* Balanço */}
      <Modal open={balanco} onClose={() => setBalanco(false)} title="Balanço do estoque" size="md">
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="Total de itens" value={state.estoque.length} tone="accent" />
          <Kpi label="Valor em estoque" value={brl(valorTotal)} tone="good" />
          <Kpi label="Itens baixos" value={baixo.length} tone="warn" />
          <Kpi label="Em falta" value={state.estoque.filter((i) => i.qtd <= 0).length} tone="bad" />
        </div>
        <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto">
          {state.estoque.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <span className="text-ink">{it.nome}</span>
              <span className="text-muted">{it.qtd} {it.unidade} • {brl(it.qtd * it.custo)}</span>
            </div>
          ))}
        </div>
      </Modal>

      {node}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <Field label={label}><Input type="number" min={0} step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} /></Field>;
}
