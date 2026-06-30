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
  SearchInput,
  Select,
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  EditIcon,
  type Tone,
} from "@/components/ui";
import { brl, fmtDate, uid } from "@/lib/utils";
import type { Orcamento } from "@/lib/types";
import { OS_STATUSES } from "@/lib/types";
import { generateQuotePdf, defaultQuoteConfig, type QuotePdfConfig } from "@/lib/pdf-editor";

const STATUSES = ["Aguardando", "Aprovado", "Faturado", "Recusado"];
const statusTone: Record<string, Tone> = {
  Aguardando: "warn",
  Aprovado: "accent",
  Faturado: "good",
  Recusado: "bad",
};

function emptyOrc(nextOrc: number): Orcamento {
  return {
    id: uid(),
    cliente: "",
    tel: "",
    end: "",
    tipo: "Elétrica",
    data: new Date().toISOString().slice(0, 10),
    valor: 0,
    status: "Aguardando",
    lucro: 0,
    tempo: "",
    itens: [],
    obs: "",
  };
}

export function Quotes() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<Orcamento | null>(null);
  const [viewing, setViewing] = useState<Orcamento | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [pdfModalOrc, setPdfModalOrc] = useState<Orcamento | null>(null);

  const q = state.orcQ.toLowerCase();
  const list = state.orc.filter(
    (o) => !q || o.cliente.toLowerCase().includes(q) || o.tipo.toLowerCase().includes(q)
  );

  const counts = STATUSES.map((st) => ({
    st,
    count: state.orc.filter((o) => o.status === st).length,
    total: state.orc.filter((o) => o.status === st).reduce((a, o) => a + o.valor, 0),
  }));

  function save() {
    if (!editing) return;
    if (!editing.cliente.trim()) {
      toast.push("Informe o cliente.", "error");
      return;
    }
    const o = editing;
    update((d) => {
      const idx = d.orc.findIndex((x) => x.id === o.id);
      if (idx >= 0) d.orc[idx] = o;
      else { d.orc.unshift(o); d.nextOrc += 1; }
    });
    toast.push(isNew ? "Orçamento criado." : "Orçamento atualizado.");
    setEditing(null);
  }

  function duplicate(o: Orcamento) {
    const copy: Orcamento = { ...o, id: uid(), cliente: `${o.cliente} (cópia)`, status: "Aguardando", data: new Date().toISOString().slice(0, 10), itens: o.itens.map((i) => ({ ...i })) };
    update((d) => { d.orc.unshift(copy); d.nextOrc += 1; });
    toast.push("Orçamento duplicado.");
  }

  async function remove(o: Orcamento) {
    if (await confirm(`Excluir orçamento de "${o.cliente}"?`)) {
      update((d) => { d.orc = d.orc.filter((x) => x.id !== o.id); });
      toast.push("Orçamento excluído.", "info");
    }
  }

  function setStatus(o: Orcamento, status: string) {
    update((d) => {
      const t = d.orc.find((x) => x.id === o.id);
      if (t) t.status = status;
    });
    setViewing((v) => (v ? { ...v, status } : v));
  }

  function approveAndGenOS(o: Orcamento) {
    update((d) => {
      const t = d.orc.find((x) => x.id === o.id);
      if (t) t.status = "Aprovado";
      const num = `OS-${String(d.nextOS).padStart(4, "0")}`;
      d.os.unshift({
        id: uid(),
        numero: num,
        cliente: o.cliente,
        tel: o.tel,
        emailCliente: "",
        endereco: o.end,
        equipamento: o.tipo,
        marca: "",
        modelo: "",
        tipo: o.tipo,
        prioridade: "Normal",
        problema: o.obs || "Gerada a partir de orçamento aprovado.",
        diagnostico: "",
        solucao: "",
        pecas: "",
        status: OS_STATUSES[0],
        valor: o.valor,
        data: new Date().toISOString().slice(0, 10),
        prazo: "",
        obs: "",
        origem: "interno",
        criadaEm: new Date().toISOString().slice(0, 10),
        fotos: [],
        historico: [{ data: new Date().toISOString().slice(0, 10), texto: "OS gerada a partir de orçamento aprovado." }],
      });
      d.nextOS += 1;
    });
    setViewing(null);
    toast.push("Aprovado! OS gerada automaticamente.");
    update((dd) => { dd.page = "os"; });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      {/* Pipeline KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {counts.map((c) => (
          <Card key={c.st} glow className="p-4">
            <div className="flex items-center justify-between">
              <Badge tone={statusTone[c.st]} dot>{c.st}</Badge>
              <span className="text-lg font-bold">{c.count}</span>
            </div>
            <div className="mt-2 font-display text-lg font-bold" style={{ color: `var(--color-${statusTone[c.st]})` }}>
              {brl(c.total)}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[200px] flex-1">
          <SearchInput value={state.orcQ} onChange={(v) => update((d) => { d.orcQ = v; })} placeholder="Buscar orçamento..." />
        </div>
        <Button onClick={() => { setEditing(emptyOrc(state.nextOrc)); setIsNew(true); }}>
          <PlusIcon /> Novo orçamento
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          emoji="📋"
          title="Nenhum orçamento"
          desc="Crie orçamentos para acompanhar seu funil comercial."
          action={<Button onClick={() => { setEditing(emptyOrc(state.nextOrc)); setIsNew(true); }}><PlusIcon /> Criar orçamento</Button>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="border-b border-line/60 last:border-0 hover:bg-surface2">
                    <td className="px-4 py-3 font-mono text-xs text-muted">#{o.id.slice(0, 4).toUpperCase()}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{o.cliente}</td>
                    <td className="px-4 py-3 text-muted">{fmtDate(o.data)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{brl(o.valor)}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone[o.status]}>{o.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewing({ ...o })} title="Ver">👁</Button>
                        <Button size="icon" variant="ghost" onClick={() => setPdfModalOrc(o)} title="PDF">📄</Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...o, itens: [...o.itens] }); setIsNew(false); }}><EditIcon /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(o)}><TrashIcon /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {list.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{o.cliente}</div>
                    <div className="text-xs text-muted">{fmtDate(o.data)}</div>
                  </div>
                  <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg font-bold">{brl(o.valor)}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="subtle" onClick={() => setViewing({ ...o })}>Ver</Button>
                    <Button size="icon" variant="ghost" onClick={() => setPdfModalOrc(o)}>📄</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...o, itens: [...o.itens] }); setIsNew(false); }}><EditIcon /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* View modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `Orçamento #${viewing.id.slice(0, 4).toUpperCase()}` : ""}
        size="md"
        footer={
          viewing && (
            <>
              {viewing.status === "Aguardando" && (
                <Button onClick={() => approveAndGenOS(viewing)}>✅ Aprovar e gerar OS</Button>
              )}
              <Button variant="subtle" onClick={() => { setEditing({ ...viewing, itens: [...viewing.itens] }); setIsNew(false); setViewing(null); }}>Editar</Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Cliente" value={viewing.cliente} />
              <Info label="Telefone" value={viewing.tel || "—"} />
              <Info label="Tipo" value={viewing.tipo} />
              <Info label="Data" value={fmtDate(viewing.data)} />
            </div>
            <div>
              <div className="mb-1.5 text-xs uppercase text-muted">Status</div>
              <Select value={viewing.status} onChange={(e) => setStatus(viewing, e.target.value)}>
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
              <span className="text-sm text-muted">Valor total</span>
              <span className="font-display text-xl font-bold text-accent">{brl(viewing.valor)}</span>
            </div>
            {viewing.obs && <Info label="Observações" value={viewing.obs} />}
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Novo orçamento" : "Editar orçamento"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Cliente"><Input value={editing.cliente} onChange={(e) => setEditing({ ...editing, cliente: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={editing.tel} onChange={(e) => setEditing({ ...editing, tel: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Endereço"><Input value={editing.end} onChange={(e) => setEditing({ ...editing, end: e.target.value })} /></Field></div>
            <Field label="Tipo"><Input value={editing.tipo} onChange={(e) => setEditing({ ...editing, tipo: e.target.value })} /></Field>
            <Field label="Data"><Input type="date" value={editing.data} onChange={(e) => setEditing({ ...editing, data: e.target.value })} /></Field>
            <NumField label="Valor (R$)" value={editing.valor} onChange={(v) => setEditing({ ...editing, valor: v })} />
            <Field label="Status">
              <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Observações"><Textarea rows={2} value={editing.obs} onChange={(e) => setEditing({ ...editing, obs: e.target.value })} /></Field></div>
          </div>
        )}
      </Modal>
      
      {/* PDF Editor Modal */}
      {pdfModalOrc && (
        <PdfEditorModal
          orc={pdfModalOrc}
          onClose={() => setPdfModalOrc(null)}
          state={state}
        />
      )}

      {node}
    </div>
  );
}

function PdfEditorModal({ orc, onClose, state }: { orc: Orcamento; onClose: () => void; state: any }) {
  const [info, setInfo] = useState<QuotePdfConfig>(() => defaultQuoteConfig(state, orc));
  const [logoPreview, setLogoPreview] = useState<string>(info.logoUrl || "");

  return (
    <Modal open={true} onClose={onClose} title="Editor de Orçamento PDF" size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={() => generateQuotePdf(state, orc, info)}>📄 Baixar PDF</Button></>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="mb-2 text-xs font-bold uppercase text-muted">Preview visual</div>
          <div className="rounded-xl border border-line bg-white p-5 text-slate-900 shadow-inner">
            <div className="flex items-start justify-between border-b-2 pb-3" style={{ borderColor: info.corPrimaria }}>
              <div>
                <div className="text-lg font-bold" style={{ color: info.corPrimaria }}>{info.companyName || state.cfg.empresa}</div>
                <div className="whitespace-pre-line text-[10px] text-slate-500">{info.companyInfo || state.cfg.sub}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400">ORÇAMENTO</div>
                {logoPreview && <img src={logoPreview} alt="logo" className="mt-1 h-10 w-auto object-contain" />}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div><span className="text-slate-400">CLIENTE</span><br/><span className="font-semibold">{info.clientName || orc.cliente}</span></div>
              <div><span className="text-slate-400">DATA</span><br/><span className="font-semibold">{fmtDate(orc.data)}</span></div>
            </div>
            <div className="mt-3 rounded border border-slate-200 p-2 text-[10px]">
              <div className="flex justify-between font-semibold bg-slate-100 p-1" style={{ background: `${info.corPrimaria}15` }}>
                <span>Serviço</span><span>Total</span>
              </div>
              {(orc.itens.length ? orc.itens : [{ nome: orc.tipo, qtd: 1, valor: orc.valor }]).map((it, i) => (
                <div key={i} className="flex justify-between py-1 border-b border-slate-100 last:border-0">
                  <span>{it.qtd}× {it.nome}</span><span>{brl(it.valor * it.qtd)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right font-bold" style={{ color: info.corSecundaria }}>TOTAL: {brl(orc.valor)}</div>
          </div>
        </div>

        <Field label="Nome da Empresa"><Input value={info.companyName} onChange={(e) => setInfo({...info, companyName: e.target.value})} /></Field>
        <Field label="Telefone do cliente"><Input value={info.clientTel} onChange={(e) => setInfo({...info, clientTel: e.target.value})} /></Field>
        <div className="sm:col-span-2"><Field label="Info da Empresa"><Textarea rows={2} value={info.companyInfo} onChange={(e) => setInfo({...info, companyInfo: e.target.value})} /></Field></div>
        <Field label="Nome do Cliente"><Input value={info.clientName} onChange={(e) => setInfo({...info, clientName: e.target.value})} /></Field>
        <Field label="Endereço do Cliente"><Input value={info.clientInfo} onChange={(e) => setInfo({...info, clientInfo: e.target.value})} /></Field>
        <Field label="Validade"><Input value={info.validade} onChange={(e) => setInfo({...info, validade: e.target.value})} /></Field>
        <div className="flex items-center gap-4 py-2">
          <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={info.mostrarAssinaturas} onChange={(e) => setInfo({...info, mostrarAssinaturas: e.target.checked})} /> Assinaturas</label>
          <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={info.mostrarLogo} onChange={(e) => setInfo({...info, mostrarLogo: e.target.checked})} /> Logo</label>
        </div>
        <div className="sm:col-span-2">
          <Field label="Logo (URL ou upload)">
            <Input value={logoPreview} onChange={(e) => { setLogoPreview(e.target.value); setInfo({...info, logoUrl: e.target.value}); }} placeholder="https://.../logo.png" />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Field label="Cor primária"><Input type="color" value={info.corPrimaria} onChange={(e) => setInfo({...info, corPrimaria: e.target.value})} /></Field>
          <Field label="Cor secundária"><Input type="color" value={info.corSecundaria} onChange={(e) => setInfo({...info, corSecundaria: e.target.value})} /></Field>
        </div>
        <div className="sm:col-span-2"><Field label="Condições de pagamento"><Textarea rows={2} value={info.condicoes} onChange={(e) => setInfo({...info, condicoes: e.target.value})} /></Field></div>
        <div className="sm:col-span-2"><Field label="Observações"><Textarea rows={2} value={info.observacoes} onChange={(e) => setInfo({...info, observacoes: e.target.value})} /></Field></div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="text-sm font-medium text-ink">{value || "—"}</div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" min={0} step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </Field>
  );
}
