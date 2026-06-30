"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Progress,
  Select,
  EmptyState,
  useToast,
  PlusIcon,
  TrashIcon,
} from "@/components/ui";
import { brl, pct, uid } from "@/lib/utils";
import type { Orcamento } from "@/lib/types";

const MODES = [
  { id: "min", label: "Econômico", tone: "good" },
  { id: "med", label: "Médio", tone: "warn" },
  { id: "max", label: "Premium", tone: "accent" },
] as const;

export function Calculator() {
  const { state, update } = useStore();
  const toast = useToast();
  const s = state;
  const [pickService, setPickService] = useState(state.services[0]?.id ?? "");
  const [saveOpen, setSaveOpen] = useState(false);
  const [cliName, setCliName] = useState("");
  const [cliTel, setCliTel] = useState("");

  const mode = s.calcMode;
  const priceOf = (serviceId: string) => {
    const sv = s.services.find((x) => x.id === serviceId);
    if (!sv) return 0;
    return mode === "min" ? sv.minVal : mode === "max" ? sv.maxVal : sv.medVal;
  };

  const items = s.calcItems
    .map((ci) => {
      const sv = s.services.find((x) => x.id === ci.serviceId);
      return sv ? { ci, sv, price: priceOf(sv.id) } : null;
    })
    .filter(Boolean) as { ci: typeof s.calcItems[number]; sv: (typeof s.services)[number]; price: number }[];

  const subtotal = items.reduce((a, it) => a + it.price * it.ci.qtd, 0);
  const custoTotal = items.reduce(
    (a, it) => a + (it.sv.material + it.sv.mdo) * it.ci.qtd,
    0
  );
  const urg = subtotal * (s.calcUrg / 100);
  const desl = subtotal * (s.calcDesl / 100) + s.cfg.deslBase;
  const desc = subtotal * (s.calcDesc / 100);
  const receita = subtotal + urg + desl - desc;
  const comissao = receita * (s.calcCom / 100);
  const lucro = receita - custoTotal - comissao;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  function addService() {
    if (!pickService) return;
    update((d) => {
      d.calcItems.push({ id: uid(), serviceId: pickService, qtd: 1 });
    });
  }
  function setQty(id: string, qtd: number) {
    update((d) => {
      const it = d.calcItems.find((x) => x.id === id);
      if (it) it.qtd = Math.max(1, qtd);
    });
  }
  function removeItem(id: string) {
    update((d) => {
      d.calcItems = d.calcItems.filter((x) => x.id !== id);
    });
  }

  function saveAsOrc() {
    const valor = receita;
    const orc: Orcamento = {
      id: uid(),
      cliente: cliName.trim() || "Cliente (calculadora)",
      tel: cliTel,
      end: "",
      tipo: items[0]?.sv.cat ?? "Geral",
      data: new Date().toISOString().slice(0, 10),
      valor,
      status: "Aguardando",
      lucro,
      tempo: items.map((i) => i.sv.tempo).filter(Boolean).join(" + "),
      itens: items.map((i) => ({ nome: i.sv.nome, qtd: i.ci.qtd, valor: i.price })),
      obs: `Gerado pela calculadora (modo ${MODES.find((m) => m.id === mode)?.label}).`,
    };
    update((d) => {
      d.orc.unshift(orc);
      d.nextOrc += 1;
      d.calcItems = [];
    });
    setSaveOpen(false);
    setCliName("");
    setCliTel("");
    toast.push("Orçamento salvo!");
    update((dd) => { dd.page = "orc"; });
  }

  const payOptions = [
    { label: "PIX", fee: 3, note: "taxa fixa" },
    { label: "Débito", fee: s.cfg.maquininha.debito },
    ...Array.from({ length: 12 }, (_, i) => ({
      label: `Crédito ${i + 1}x`,
      fee: s.cfg.maquininha[`credito${i + 1}` as keyof typeof s.cfg.maquininha],
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      {/* Mode toggle */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => update((d) => { d.calcMode = m.id; })}
            className={`rounded-xl border px-3 py-3 text-center transition ${
              mode === m.id
                ? "border-accent bg-accent/15"
                : "border-line bg-surface hover:bg-surface2"
            }`}
          >
            <div className="text-xs uppercase tracking-wide text-muted">{m.label}</div>
            <div className="mt-0.5 font-display text-sm font-bold" style={{ color: `var(--color-${m.tone})` }}>
              {m.id === "min" ? "mín" : m.id === "max" ? "máx" : "médio"}
            </div>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Builder */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <div className="min-w-[180px] flex-1">
                <Field label="Adicionar serviço">
                  <Select value={pickService} onChange={(e) => setPickService(e.target.value)}>
                    {state.services.length === 0 && <option value="">Nenhum serviço</option>}
                    {state.services.map((sv) => (
                      <option key={sv.id} value={sv.id}>
                        {sv.nome} — {brl(mode === "min" ? sv.minVal : mode === "max" ? sv.maxVal : sv.medVal)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Button onClick={addService} disabled={!pickService}>
                <PlusIcon /> Adicionar
              </Button>
            </div>

            {items.length === 0 ? (
              <EmptyState
                emoji="🧮"
                title="Monte seu orçamento"
                desc="Adicione serviços para calcular o preço, custos e lucro automaticamente."
              />
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div
                    key={it.ci.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{it.sv.nome}</div>
                      <div className="text-xs text-muted">{brl(it.price)} un.</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Stepper value={it.ci.qtd} onDec={() => setQty(it.ci.id, it.ci.qtd - 1)} onInc={() => setQty(it.ci.id, it.ci.qtd + 1)} />
                    </div>
                    <div className="w-20 text-right text-sm font-bold text-ink">
                      {brl(it.price * it.ci.qtd)}
                    </div>
                    <button className="text-muted hover:text-bad" onClick={() => removeItem(it.ci.id)}>
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Sliders */}
          <Card className="space-y-4 p-4">
            <h3 className="font-display text-sm font-bold">Ajustes</h3>
            <Slider label="Deslocamento" value={s.calcDesl} onChange={(v) => update((d) => { d.calcDesl = v; })} suffix="%" extra={`base ${brl(s.cfg.deslBase)}`} />
            <Slider label="Urgência" value={s.calcUrg} onChange={(v) => update((d) => { d.calcUrg = v; })} suffix="%" />
            <Slider label="Desconto" value={s.calcDesc} onChange={(v) => update((d) => { d.calcDesc = v; })} suffix="%" tone="good" />
            <Slider label="Comissão" value={s.calcCom} onChange={(v) => update((d) => { d.calcCom = v; })} suffix="%" tone="bad" />
          </Card>

          {/* Payment simulation */}
          {receita > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 font-display text-sm font-bold">Simulação de pagamento</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {payOptions.map((p) => (
                  <div key={p.label} className="rounded-lg border border-line bg-surface p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink">{p.label}</span>
                      <span className="text-[10px] text-bad">-{pct(p.fee, 1)}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-good">
                      {brl(receita * (1 - p.fee / 100))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-1">
          <Card glow className="sticky top-20 p-5">
            <h3 className="mb-4 font-display text-base font-bold">Resultado</h3>
            <div className="space-y-2.5 text-sm">
              <Row label="Subtotal" value={brl(subtotal)} />
              <Row label="Urgência" value={`+ ${brl(urg)}`} tone="warn" />
              <Row label="Deslocamento" value={`+ ${brl(desl)}`} tone="info" />
              <Row label="Desconto" value={`- ${brl(desc)}`} tone="good" />
              <div className="my-2 border-t border-line" />
              <Row label="Receita final" value={brl(receita)} big />
              <Row label="Custo estimado" value={brl(custoTotal)} tone="bad" />
              <Row label="Comissão" value={brl(comissao)} tone="bad" />
              <div className="my-2 border-t border-line" />
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase text-muted">Lucro líquido</span>
                <span className="font-display text-xl font-bold text-good">{brl(lucro)}</span>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">Margem</span>
                  <span className="font-bold text-accent">{pct(margem, 1)}</span>
                </div>
                <Progress value={margem} max={100} />
              </div>
            </div>

            <Button className="mt-4 w-full" disabled={items.length === 0} onClick={() => setSaveOpen(true)}>
              💾 Salvar como orçamento
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Salvar orçamento"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={saveAsOrc}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Cliente">
            <Input value={cliName} onChange={(e) => setCliName(e.target.value)} placeholder="Nome do cliente" />
          </Field>
          <Field label="Telefone (opcional)">
            <Input value={cliTel} onChange={(e) => setCliTel(e.target.value)} placeholder="(11) 9...." />
          </Field>
          <div className="rounded-xl border border-line bg-surface p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Valor</span><span className="font-bold">{brl(receita)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Lucro</span><span className="font-bold text-good">{brl(lucro)}</span></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex items-center rounded-lg border border-line bg-surface2">
      <button className="px-2 py-1 text-muted hover:text-ink" onClick={onDec}>−</button>
      <span className="w-7 text-center text-sm font-semibold">{value}</span>
      <button className="px-2 py-1 text-muted hover:text-ink" onClick={onInc}>+</button>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  suffix = "",
  tone = "accent",
  extra,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  tone?: "accent" | "good" | "bad";
  extra?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-muted">{label}{extra && <span className="ml-1 text-line">({extra})</span>}</span>
        <span className="font-bold" style={{ color: `var(--color-${tone})` }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={0}
        max={50}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full"
        style={{ accentColor: `var(--color-${tone})` }}
      />
    </div>
  );
}

function Row({ label, value, tone, big }: { label: string; value: string; tone?: "good" | "bad" | "warn" | "info"; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={big ? "font-display font-bold" : "font-semibold"} style={{ color: tone ? `var(--color-${tone})` : undefined }}>
        {value}
      </span>
    </div>
  );
}
