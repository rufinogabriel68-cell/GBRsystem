"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  Modal,
  SearchInput,
  Select,
  Textarea,
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  EditIcon,
  type Tone,
} from "@/components/ui";
import { brl, pct, uid } from "@/lib/utils";
import type { Service } from "@/lib/types";

const TIPOS = ["Técnico", "Instalação", "Consultoria", "Preventiva"];
const DIFS = ["Fácil", "Médio", "Difícil", "Especialista"];

const difTone: Record<string, Tone> = {
  Fácil: "good",
  Médio: "warn",
  Difícil: "bad",
  Especialista: "accent",
};

function emptyService(cat: string): Service {
  return {
    id: uid(),
    nome: "",
    cat,
    tipo: "Técnico",
    minVal: 0,
    medVal: 0,
    maxVal: 0,
    material: 0,
    mdo: 0,
    tempo: "",
    dific: "Médio",
    margem: 60,
  };
}

export function Services() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<Service | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [newCat, setNewCat] = useState("");

  const q = state.srvQ.toLowerCase();
  const filtered = state.services.filter((sv) => {
    const okCat = state.srvCat === "todas" || sv.cat === state.srvCat;
    const okQ =
      !q ||
      sv.nome.toLowerCase().includes(q) ||
      sv.cat.toLowerCase().includes(q);
    return okCat && okQ;
  });

  function save() {
    if (!editing) return;
    if (!editing.nome.trim()) {
      toast.push("Informe o nome do serviço.", "error");
      return;
    }
    const sv = editing;
    update((d) => {
      const idx = d.services.findIndex((x) => x.id === sv.id);
      if (idx >= 0) d.services[idx] = sv;
      else d.services.push(sv);
    });
    toast.push(isNew ? "Serviço criado." : "Serviço atualizado.");
    setEditing(null);
  }

  async function remove(sv: Service) {
    if (await confirm(`Excluir o serviço "${sv.nome}"?`)) {
      update((d) => {
        d.services = d.services.filter((x) => x.id !== sv.id);
      });
      toast.push("Serviço excluído.", "info");
    }
  }

  function addToCalc(sv: Service) {
    update((d) => {
      d.calcItems.push({ id: uid(), serviceId: sv.id, qtd: 1 });
      d.page = "calc";
    });
    toast.push(`"${sv.nome}" adicionado à calculadora.`);
  }

  function addCategory() {
    const c = newCat.trim();
    if (!c || state.categorias.includes(c)) return;
    update((d) => {
      d.categorias.push(c);
    });
    setNewCat("");
  }
  function removeCategory(c: string) {
    update((d) => {
      d.categorias = d.categorias.filter((x) => x !== c);
      if (d.srvCat === c) d.srvCat = "todas";
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <SearchInput
            value={state.srvQ}
            onChange={(v) => update((d) => { d.srvQ = v; })}
            placeholder="Buscar serviço..."
          />
        </div>
        <Button variant="subtle" onClick={() => setCatModal(true)}>
          🏷️ Categorias
        </Button>
        <Button
          onClick={() => {
            setEditing(emptyService(state.categorias[0] ?? "Geral"));
            setIsNew(true);
          }}
        >
          <PlusIcon /> Novo serviço
        </Button>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
        <Chip
          active={state.srvCat === "todas"}
          onClick={() => update((d) => { d.srvCat = "todas"; })}
        >
          Todas
        </Chip>
        {state.categorias.map((c) => (
          <Chip
            key={c}
            active={state.srvCat === c}
            onClick={() => update((d) => { d.srvCat = c; })}
          >
            {c}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          emoji="🔧"
          title="Nenhum serviço encontrado"
          desc="Cadastre seus serviços para usar na calculadora e nos orçamentos."
          action={
            <Button
              onClick={() => {
                setEditing(emptyService(state.categorias[0] ?? "Geral"));
                setIsNew(true);
              }}
            >
              <PlusIcon /> Cadastrar serviço
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((sv) => (
            <Card key={sv.id} glow className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight text-ink">{sv.nome}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone="info">{sv.cat}</Badge>
                    <Badge tone="neutral">{sv.tipo}</Badge>
                    <Badge tone={difTone[sv.dific] ?? "neutral"}>{sv.dific}</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <PriceCell label="Econ" value={brl(sv.minVal)} tone="good" />
                <PriceCell label="Médio" value={brl(sv.medVal)} tone="warn" />
                <PriceCell label="Premium" value={brl(sv.maxVal)} tone="accent" />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>⏱️ {sv.tempo || "—"}</span>
                <span>Custos: {brl(sv.material + sv.mdo)}</span>
                <span className="font-semibold text-good">{pct(sv.margem)}</span>
              </div>

              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <Button size="sm" variant="subtle" className="flex-1" onClick={() => addToCalc(sv)}>
                  🧮 Calcular
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing({ ...sv }); setIsNew(false); }}>
                  <EditIcon />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(sv)}>
                  <TrashIcon />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Service modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Novo serviço" : "Editar serviço"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome do serviço">
                <Input
                  value={editing.nome}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                  placeholder="Ex.: Instalação de tomadas"
                />
              </Field>
            </div>
            <Field label="Categoria">
              <Select
                value={editing.cat}
                onChange={(e) => setEditing({ ...editing, cat: e.target.value })}
              >
                {state.categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo">
              <Select
                value={editing.tipo}
                onChange={(e) => setEditing({ ...editing, tipo: e.target.value })}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <NumField label="Preço econômico (mín)" value={editing.minVal} onChange={(v) => setEditing({ ...editing, minVal: v })} />
            <NumField label="Preço médio" value={editing.medVal} onChange={(v) => setEditing({ ...editing, medVal: v })} />
            <NumField label="Preço premium (máx)" value={editing.maxVal} onChange={(v) => setEditing({ ...editing, maxVal: v })} />
            <NumField label="Custo material" value={editing.material} onChange={(v) => setEditing({ ...editing, material: v })} />
            <NumField label="Custo mão de obra" value={editing.mdo} onChange={(v) => setEditing({ ...editing, mdo: v })} />
            <Field label="Tempo estimado">
              <Input
                value={editing.tempo}
                onChange={(e) => setEditing({ ...editing, tempo: e.target.value })}
                placeholder="Ex.: 2h"
              />
            </Field>
            <Field label="Dificuldade">
              <Select
                value={editing.dific}
                onChange={(e) => setEditing({ ...editing, dific: e.target.value })}
              >
                {DIFS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <NumField label="Margem (%)" value={editing.margem} onChange={(v) => setEditing({ ...editing, margem: v })} />
          </div>
        )}
      </Modal>

      {/* Categories modal */}
      <Modal
        open={catModal}
        onClose={() => setCatModal(false)}
        title="Gerenciar categorias"
        size="sm"
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="Nova categoria"
            />
            <Button onClick={addCategory}>
              <PlusIcon />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.categorias.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold"
              >
                {c}
                <button
                  className="text-bad hover:scale-110"
                  onClick={() => removeCategory(c)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      </Modal>

      {node}
    </div>
  );
}

function PriceCell({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-2">
      <div className="text-[10px] uppercase text-muted">{label}</div>
      <div className="text-sm font-bold" style={{ color: `var(--color-${tone})` }}>
        {value}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </Field>
  );
}
