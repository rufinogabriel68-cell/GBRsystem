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
  Textarea,
  Select,
  SearchInput,
  Stars,
  Tabs,
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  EditIcon,
  type Tone,
} from "@/components/ui";
import { brl, fmtDate, uid, initials, colorFromString } from "@/lib/utils";
import { garantiaStatus } from "@/lib/metrics";
import type { Cliente, Lead, Garantia } from "@/lib/types";

const cliTone: Record<string, Tone> = { VIP: "accent", Recorrente: "good", Novo: "info", Inadimplente: "bad" };
const LEAD_STAGES = ["Primeiro contato", "Negociando", "Proposta enviada", "Fechado Ganho", "Fechado Perdido"];
const leadTone: Record<string, Tone> = {
  "Primeiro contato": "info",
  Negociando: "warn",
  "Proposta enviada": "accent",
  "Fechado Ganho": "good",
  "Fechado Perdido": "bad",
};

export function CRM() {
  const { state, update } = useStore();
  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      <Tabs
        active={state.crmTab}
        onChange={(id) => update((d) => { d.crmTab = id; })}
        tabs={[
          { id: "clientes", label: "Clientes", count: state.clientes.length },
          { id: "leads", label: "Leads", count: state.leads.length },
          { id: "garantias", label: "Garantias", count: state.garantias.length },
          { id: "depoimentos", label: "Depoimentos", count: state.clientes.filter((c) => c.depoimento).length },
        ]}
      />
      {state.crmTab === "clientes" && <ClientsTab />}
      {state.crmTab === "leads" && <LeadsTab />}
      {state.crmTab === "garantias" && <GarantiasTab />}
      {state.crmTab === "depoimentos" && <DepoimentosTab />}
    </div>
  );
}

/* ---------------- Clients ---------------- */
function emptyClient(): Cliente {
  return {
    id: uid(), nome: "", tel: "", end: "", email: "", tipo: "Novo", origem: "Indicação",
    servicos: "", gasto: 0, nps: 0, depoimento: "", followupData: new Date().toISOString().slice(0, 10),
    followupStatus: "Pendente", equipamentos: [], contratos: [], historico: [], obs: "",
  };
}

function ClientsTab() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [viewing, setViewing] = useState<Cliente | null>(null);
  const [isNew, setIsNew] = useState(false);

  const q = state.cliQ.toLowerCase();
  const list = state.clientes.filter((c) => !q || c.nome.toLowerCase().includes(q) || c.tel.includes(q));

  function save() {
    if (!editing) return;
    if (!editing.nome.trim()) { toast.push("Informe o nome.", "error"); return; }
    const c = editing;
    update((d) => {
      const idx = d.clientes.findIndex((x) => x.id === c.id);
      if (idx >= 0) d.clientes[idx] = c; else { d.clientes.unshift(c); d.nextCli += 1; }
    });
    toast.push(isNew ? "Cliente criado." : "Cliente atualizado.");
    setEditing(null);
  }
  async function remove(c: Cliente) {
    if (await confirm(`Excluir o cliente "${c.nome}"?`)) {
      update((d) => { d.clientes = d.clientes.filter((x) => x.id !== c.id); });
      toast.push("Cliente excluído.", "info");
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1"><SearchInput value={state.cliQ} onChange={(v) => update((d) => { d.cliQ = v; })} placeholder="Buscar cliente..." /></div>
        <Button onClick={() => { setEditing(emptyClient()); setIsNew(true); }}><PlusIcon /> Novo cliente</Button>
      </div>

      {list.length === 0 ? (
        <EmptyState emoji="👥" title="Nenhum cliente" desc="Cadastre clientes para gerenciar todo o relacionamento." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => {
            const atrasado = c.followupStatus === "Atrasado";
            return (
              <Card key={c.id} glow className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: colorFromString(c.nome) }}>
                    {initials(c.nome)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-ink">{c.nome}</span>
                      <Badge tone={cliTone[c.tipo] ?? "neutral"}>{c.tipo}</Badge>
                    </div>
                    <div className="text-xs text-muted">{c.tel || "sem telefone"}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Stars value={c.nps} />
                      <span className="text-xs text-muted">• {brl(c.gasto)} gastos</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
                  <span className={atrasado ? "text-bad" : "text-muted"}>
                    Follow-up: {c.followupStatus} {c.followupData && `• ${fmtDate(c.followupData)}`}
                  </span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="subtle" onClick={() => setViewing({ ...c })}>Ver</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...c, equipamentos: [...c.equipamentos], contratos: [...c.contratos], historico: [...c.historico] }); setIsNew(false); }}><EditIcon /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c)}><TrashIcon /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* View */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.nome} size="md">
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={cliTone[viewing.tipo] ?? "neutral"} dot>{viewing.tipo}</Badge>
              <Badge tone="info">{viewing.origem}</Badge>
              <Stars value={viewing.nps} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Telefone" v={viewing.tel} />
              <KV k="Email" v={viewing.email} />
              <KV k="Endereço" v={viewing.end} />
              <KV k="Total gasto" v={brl(viewing.gasto)} />
              <KV k="Serviços" v={viewing.servicos} />
              <KV k="Follow-up" v={`${viewing.followupStatus} • ${fmtDate(viewing.followupData)}`} />
            </div>
            {viewing.equipamentos.length > 0 && (
              <div><div className="mb-1 text-xs uppercase text-muted">Equipamentos</div><div className="flex flex-wrap gap-1.5">{viewing.equipamentos.map((e, i) => <Badge key={i} tone="neutral">{e}</Badge>)}</div></div>
            )}
            {viewing.contratos.length > 0 && (
              <div><div className="mb-1 text-xs uppercase text-muted">Contratos ativos</div><div className="flex flex-wrap gap-1.5">{viewing.contratos.map((e, i) => <Badge key={i} tone="good">{e}</Badge>)}</div></div>
            )}
            <div><div className="mb-1 text-xs uppercase text-muted">Histórico</div><div className="space-y-1.5">{viewing.historico.length === 0 ? <span className="text-sm text-muted">Sem registros.</span> : [...viewing.historico].reverse().map((h, i) => (
              <div key={i} className="flex gap-2 text-sm"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /><span className="text-muted">{fmtDate(h.data)} — <span className="text-ink">{h.texto}</span></span></div>
            ))}</div></div>
            {viewing.obs && <div className="rounded-xl border border-line bg-surface p-3 text-sm text-muted">{viewing.obs}</div>}
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Novo cliente" : "Editar cliente"} size="lg"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome"><Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={editing.tel} onChange={(e) => setEditing({ ...editing, tel: e.target.value })} /></Field>
            <Field label="Email"><Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Endereço"><Input value={editing.end} onChange={(e) => setEditing({ ...editing, end: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={editing.tipo} onChange={(e) => setEditing({ ...editing, tipo: e.target.value })}>{["Novo", "Recorrente", "VIP", "Inadimplente"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Origem"><Select value={editing.origem} onChange={(e) => setEditing({ ...editing, origem: e.target.value })}>{["Indicação", "Google", "Instagram", "Facebook", "Chamado online", "OS"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="NPS (1-5)"><Stars value={editing.nps} onChange={(v) => setEditing({ ...editing, nps: v })} size="text-lg" /></Field>
            <NumField label="Total gasto" value={editing.gasto} onChange={(v) => setEditing({ ...editing, gasto: v })} />
            <Field label="Follow-up data"><Input type="date" value={editing.followupData} onChange={(e) => setEditing({ ...editing, followupData: e.target.value })} /></Field>
            <Field label="Follow-up status"><Select value={editing.followupStatus} onChange={(e) => setEditing({ ...editing, followupStatus: e.target.value })}>{["Pendente", "Concluído", "Atrasado"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <div className="sm:col-span-2"><Field label="Serviços contratados"><Input value={editing.servicos} onChange={(e) => setEditing({ ...editing, servicos: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Depoimento"><Textarea rows={2} value={editing.depoimento} onChange={(e) => setEditing({ ...editing, depoimento: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Observações"><Textarea rows={2} value={editing.obs} onChange={(e) => setEditing({ ...editing, obs: e.target.value })} /></Field></div>
          </div>
        )}
      </Modal>
      {node}
    </>
  );
}

/* ---------------- Leads ---------------- */
function emptyLead(): Lead {
  return { id: uid(), nome: "", tel: "", interesse: "", origem: "Google", status: "Primeiro contato", valorEst: 0, obs: "", data: new Date().toISOString().slice(0, 10) };
}
function LeadsTab() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<Lead | null>(null);
  const [isNew, setIsNew] = useState(false);

  function save() {
    if (!editing) return;
    if (!editing.nome.trim()) { toast.push("Informe o nome.", "error"); return; }
    const l = editing;
    update((d) => {
      const idx = d.leads.findIndex((x) => x.id === l.id);
      if (idx >= 0) d.leads[idx] = l; else { d.leads.unshift(l); d.nextLead += 1; }
    });
    toast.push(isNew ? "Lead criado." : "Lead atualizado.");
    setEditing(null);
  }
  async function remove(l: Lead) {
    if (await confirm(`Excluir o lead "${l.nome}"?`)) {
      update((d) => { d.leads = d.leads.filter((x) => x.id !== l.id); });
      toast.push("Lead excluído.", "info");
    }
  }
  function convert(l: Lead) {
    update((d) => {
      d.clientes.push({ ...emptyClient(), nome: l.nome, tel: l.tel, servicos: l.interesse, origem: l.origem, gasto: l.valorEst });
      d.leads = d.leads.map((x) => x.id === l.id ? { ...x, status: "Fechado Ganho" } : x);
      d.nextCli += 1;
    });
    toast.push("Lead convertido em cliente!");
    update((dd) => { dd.crmTab = "clientes"; });
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={() => { setEditing(emptyLead()); setIsNew(true); }}><PlusIcon /> Novo lead</Button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {state.leads.length === 0 && <div className="sm:col-span-2 xl:col-span-3"><EmptyState emoji="🎯" title="Sem leads" desc="Cadastre leads para acompanhar seu funil de vendas." /></div>}
        {state.leads.map((l) => (
          <Card key={l.id} glow className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="truncate font-semibold text-ink">{l.nome}</div><div className="text-xs text-muted">{l.interesse}</div></div>
              <Badge tone={leadTone[l.status] ?? "neutral"} dot>{l.status}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-display text-lg font-bold text-accent">{brl(l.valorEst)}</span>
              <span className="text-xs text-muted">{l.origem}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted">{l.obs}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
              <Select className="h-8 flex-1 py-1 text-xs" value={l.status} onChange={(e) => update((d) => { const t = d.leads.find((x) => x.id === l.id); if (t) t.status = e.target.value; })}>
                {LEAD_STAGES.map((s) => <option key={s}>{s}</option>)}
              </Select>
              {l.status !== "Fechado Ganho" && <Button size="sm" variant="subtle" onClick={() => convert(l)}>Converter</Button>}
              <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...l }); setIsNew(false); }}><EditIcon /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(l)}><TrashIcon /></Button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Novo lead" : "Editar lead"} size="md"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome"><Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={editing.tel} onChange={(e) => setEditing({ ...editing, tel: e.target.value })} /></Field>
            <Field label="Interesse"><Input value={editing.interesse} onChange={(e) => setEditing({ ...editing, interesse: e.target.value })} /></Field>
            <Field label="Origem"><Select value={editing.origem} onChange={(e) => setEditing({ ...editing, origem: e.target.value })}>{["Google", "Instagram", "Facebook", "Indicação"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <NumField label="Valor estimado" value={editing.valorEst} onChange={(v) => setEditing({ ...editing, valorEst: v })} />
            <Field label="Estágio"><Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>{LEAD_STAGES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <div className="sm:col-span-2"><Field label="Observações"><Textarea rows={2} value={editing.obs} onChange={(e) => setEditing({ ...editing, obs: e.target.value })} /></Field></div>
          </div>
        )}
      </Modal>
      {node}
    </>
  );
}

/* ---------------- Garantias ---------------- */
function emptyGar(): Garantia {
  return { id: uid(), cliente: "", servico: "", dataServico: new Date().toISOString().slice(0, 10), diasGarantia: 90, obs: "" };
}
function GarantiasTab() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<Garantia | null>(null);
  const [isNew, setIsNew] = useState(false);

  const list = [...state.garantias].map((g) => ({ g, st: garantiaStatus(g.dataServico, g.diasGarantia) })).sort((a, b) => a.st.dias - b.st.dias);

  function save() {
    if (!editing) return;
    if (!editing.cliente.trim()) { toast.push("Informe o cliente.", "error"); return; }
    const g = editing;
    update((d) => {
      const idx = d.garantias.findIndex((x) => x.id === g.id);
      if (idx >= 0) d.garantias[idx] = g; else { d.garantias.unshift(g); d.nextGar += 1; }
    });
    toast.push(isNew ? "Garantia criada." : "Garantia atualizada.");
    setEditing(null);
  }
  async function remove(g: Garantia) {
    if (await confirm(`Excluir garantia de "${g.cliente}"?`)) {
      update((d) => { d.garantias = d.garantias.filter((x) => x.id !== g.id); });
      toast.push("Garantia excluída.", "info");
    }
  }

  return (
    <>
      <div className="flex justify-end"><Button onClick={() => { setEditing(emptyGar()); setIsNew(true); }}><PlusIcon /> Nova garantia</Button></div>
      {list.length === 0 ? (
        <EmptyState emoji="🛡️" title="Nenhuma garantia" desc="Registre garantias para acompanhar os prazos automaticamente." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(({ g, st }) => (
            <Card key={g.id} glow className="p-4" >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{st.vencida ? "⛔" : st.proxima ? "⏳" : "🛡️"}</span>
                  <div><div className="font-semibold text-ink">{g.cliente}</div><div className="text-xs text-muted">{g.servico}</div></div>
                </div>
                <Badge tone={st.vencida ? "bad" : st.proxima ? "warn" : "good"}>{st.vencida ? "Vencida" : st.proxima ? "Vence em breve" : "Válida"}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">Desde {fmtDate(g.dataServico)} • {g.diasGarantia}d</span>
                <span className="font-bold" style={{ color: `var(--color-${st.vencida ? "bad" : st.proxima ? "warn" : "good"})` }}>{st.vencida ? `há ${Math.abs(st.dias)}d` : `${st.dias}d restantes`}</span>
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...g }); setIsNew(false); }}><EditIcon /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(g)}><TrashIcon /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Nova garantia" : "Editar garantia"} size="md"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Cliente"><Input value={editing.cliente} onChange={(e) => setEditing({ ...editing, cliente: e.target.value })} /></Field>
            <Field label="Serviço"><Input value={editing.servico} onChange={(e) => setEditing({ ...editing, servico: e.target.value })} /></Field>
            <Field label="Data do serviço"><Input type="date" value={editing.dataServico} onChange={(e) => setEditing({ ...editing, dataServico: e.target.value })} /></Field>
            <NumField label="Dias de garantia" value={editing.diasGarantia} onChange={(v) => setEditing({ ...editing, diasGarantia: v })} />
            <div className="sm:col-span-2"><Field label="Observações"><Input value={editing.obs} onChange={(e) => setEditing({ ...editing, obs: e.target.value })} /></Field></div>
          </div>
        )}
      </Modal>
      {node}
    </>
  );
}

/* ---------------- Depoimentos ---------------- */
function DepoimentosTab() {
  const { state } = useStore();
  const toast = useToast();
  const list = state.clientes.filter((c) => c.depoimento.trim());
  if (list.length === 0) return <EmptyState emoji="💬" title="Sem depoimentos" desc="Adicione depoimentos aos clientes para destacá-los aqui." />;
  function copy(c: Cliente, target: "wpp" | "ig") {
    const text = `"${c.depoimento}" — ${c.nome}`;
    if (target === "wpp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      navigator.clipboard?.writeText(text);
      toast.push("Depoimento copiado!");
    }
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {list.map((c) => (
        <Card key={c.id} glow className="flex flex-col p-4">
          <div className="text-3xl leading-none text-accent">"</div>
          <p className="flex-1 text-sm text-ink">{c.depoimento}</p>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: colorFromString(c.nome) }}>{initials(c.nome)}</div>
            <div className="flex-1"><div className="text-sm font-semibold text-ink">{c.nome}</div><Stars value={c.nps} /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="subtle" className="flex-1" onClick={() => copy(c, "wpp")}>WhatsApp</Button>
            <Button size="sm" variant="subtle" className="flex-1" onClick={() => copy(c, "ig")}>Copiar</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return <div><div className="text-[10px] uppercase text-muted">{k}</div><div className="text-sm text-ink">{v || "—"}</div></div>;
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <Field label={label}><Input type="number" min={0} step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} /></Field>;
}
