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
  Tabs,
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  EditIcon,
  type Tone,
} from "@/components/ui";
import * as M from "@/lib/metrics";
import { brl, fmtDate, uid, daysBetween, todayISO } from "@/lib/utils";
import {
  OS_STATUSES,
  OS_STATUS_FLOW,
  type OrdemServico,
} from "@/lib/types";

const FLOW = OS_STATUSES.filter((s) => s !== "Cancelada");
const statusTone: Record<string, Tone> = {
  Aberta: "info",
  Diagnóstico: "accent",
  "Em Execução": "accent",
  "Aguardando Peça": "warn",
  Concluída: "good",
  Entregue: "good",
  Cancelada: "bad",
};
const prioTone: Record<string, Tone> = {
  Normal: "neutral",
  Alta: "warn",
  Urgente: "bad",
};

function emptyOS(nextNum: number): OrdemServico {
  const today = todayISO();
  return {
    id: uid(),
    numero: `OS-${String(nextNum).padStart(4, "0")}`,
    cliente: "",
    tel: "",
    emailCliente: "",
    endereco: "",
    equipamento: "",
    marca: "",
    modelo: "",
    tipo: "Elétrica",
    prioridade: "Normal",
    problema: "",
    diagnostico: "",
    solucao: "",
    pecas: "",
    status: "Aberta",
    valor: 0,
    data: today,
    prazo: "",
    obs: "",
    origem: "interno",
    criadaEm: today,
    fotos: [],
    historico: [{ data: today, texto: "OS aberta." }],
    tokenAcesso: uid().slice(0, 16),
    notifyWhatsApp: true,
    notifyEmail: false,
    mensagens: [],
    garantiaDias: 90,
    garantiaInicio: today,
  };
}

export function ServiceOrders() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<OrdemServico | null>(null);
  const [viewing, setViewing] = useState<OrdemServico | null>(null);
  const [isNew, setIsNew] = useState(false);

  const chamados = M.chamadosNaoTriados(state);
  const tab = state.osTab;
  const list = state.os.filter((o) => {
    if (tab === "todas") return true;
    if (tab === "abertas") return ["Aberta", "Diagnóstico"].includes(o.status);
    if (tab === "andamento") return ["Em Execução", "Aguardando Peça"].includes(o.status);
    if (tab === "concluidas") return ["Concluída", "Entregue"].includes(o.status);
    if (tab === "urgentes") return prioTone[o.prioridade] !== "neutral" && o.status !== "Cancelada" && o.status !== "Entregue";
    if (tab === "chamados") return o.origem === "cliente";
    return true;
  });

  function save() {
    if (!editing) return;
    if (!editing.cliente.trim() || !editing.equipamento.trim()) {
      toast.push("Informe cliente e equipamento.", "error");
      return;
    }
    const o = editing;
    update((d) => {
      const idx = d.os.findIndex((x) => x.id === o.id);
      if (idx >= 0) d.os[idx] = o;
      else { d.os.unshift(o); d.nextOS += 1; }
    });
    toast.push(isNew ? "OS criada." : "OS atualizada.");
    setEditing(null);
  }

  async function remove(o: OrdemServico) {
    if (await confirm(`Excluir a OS ${o.numero}?`)) {
      update((d) => { d.os = d.os.filter((x) => x.id !== o.id); });
      setViewing(null);
      toast.push("OS excluída.", "info");
    }
  }

  function advance(o: OrdemServico) {
    const next = OS_STATUS_FLOW[o.status];
    if (!next || next === o.status) return;
    update((d) => {
      const t = d.os.find((x) => x.id === o.id);
      if (t) {
        t.status = next;
        t.historico.push({ data: todayISO(), texto: `Status avançado para "${next}".` });
        if (!t.tokenAcesso) t.tokenAcesso = uid().slice(0, 16);
        // mensagem automática
        if (!t.mensagens) t.mensagens = [];
        t.mensagens.push({
          id: uid(),
          autor: "sistema",
          nome: "GBR OS",
          texto: `Status atualizado para: ${next}`,
          data: new Date().toISOString(),
          lida: false,
        });
      }
    });
    setViewing((v) => (v ? { ...v, status: next, historico: [...v.historico, { data: todayISO(), texto: `Status avançado para "${next}".` }] } : v));
    toast.push(`OS → ${next} • notificando cliente...`);
    // Notify
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        osNumero: o.numero,
        cliente: o.cliente,
        tel: o.tel,
        email: o.emailCliente,
        status: next,
        notifyWhatsApp: o.notifyWhatsApp ?? true,
        notifyEmail: o.notifyEmail ?? !!o.emailCliente,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.results?.whatsapp === "sent" || d.results?.email === "sent")
          toast.push("Cliente notificado!", "success");
        else if (d.results?.whatsapp === "simulated" || d.results?.email === "simulated")
          toast.push("Notificação simulada (configure Twilio/Resend)", "info");
      })
      .catch(() => {});
  }

  function changeStatus(o: OrdemServico, status: string) {
    update((d) => {
      const t = d.os.find((x) => x.id === o.id);
      if (t) {
        t.status = status;
        t.historico.push({ data: todayISO(), texto: `Status alterado para "${status}".` });
        if (!t.tokenAcesso) t.tokenAcesso = uid().slice(0, 16);
        if (!t.mensagens) t.mensagens = [];
        t.mensagens.push({
          id: uid(),
          autor: "sistema",
          nome: "GBR OS",
          texto: `Status atualizado para: ${status}`,
          data: new Date().toISOString(),
          lida: false,
        });
      }
    });
    setViewing((v) => (v ? { ...v, status } : v));
    toast.push(`Status: ${status}`, "info");
    // Notify
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        osNumero: o.numero,
        cliente: o.cliente,
        tel: o.tel,
        email: o.emailCliente,
        status,
        notifyWhatsApp: o.notifyWhatsApp ?? true,
        notifyEmail: o.notifyEmail ?? !!o.emailCliente,
      }),
    }).catch(() => {});
  }

  function registerClient(o: OrdemServico) {
    const exists = state.clientes.some((c) => c.nome.toLowerCase() === o.cliente.toLowerCase().trim());
    if (exists) {
      toast.push("Cliente já cadastrado no CRM.", "info");
      return;
    }
    update((d) => {
      d.clientes.push({
        id: uid(),
        nome: o.cliente,
        tel: o.tel,
        end: o.endereco,
        email: o.emailCliente,
        tipo: "Novo",
        origem: o.origem === "cliente" ? "Chamado online" : "OS",
        servicos: o.tipo,
        gasto: 0,
        nps: 0,
        depoimento: "",
        followupData: todayISO(),
        followupStatus: "Pendente",
        equipamentos: [o.equipamento].filter(Boolean),
        contratos: [],
        historico: [{ data: todayISO(), texto: `Cliente cadastrado a partir da ${o.numero}.` }],
        obs: "",
      });
      d.nextCli += 1;
    });
    toast.push("Cliente cadastrado no CRM!");
  }

  function onUpload(o: OrdemServico, files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).slice(0, 4).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        update((d) => {
          const t = d.os.find((x) => x.id === o.id);
          if (t) { t.fotos.push(url); t.historico.push({ data: todayISO(), texto: "Foto anexada." }); }
        });
        setViewing((v) => (v && v.id === o.id ? { ...v, fotos: [...v.fotos, url] } : v));
      };
      reader.readAsDataURL(file);
    });
    toast.push("Foto(s) anexada(s).");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      {chamados.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3">
          <span className="text-xl">🔔</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-bad">{chamados.length} chamado(s) novo(s) para triagem</div>
            <div className="text-xs text-muted">Clientes abriram chamados online. Avalie e atenda.</div>
          </div>
          <Button size="sm" variant="danger" onClick={() => update((d) => { d.osTab = "chamados"; })}>Triar agora</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          active={tab}
          onChange={(id) => update((d) => { d.osTab = id; })}
          tabs={[
            { id: "todas", label: "Todas", count: state.os.length },
            { id: "abertas", label: "Abertas" },
            { id: "andamento", label: "Execução" },
            { id: "concluidas", label: "Concluídas" },
            { id: "urgentes", label: "Urgentes" },
            { id: "chamados", label: "Chamados" },
          ]}
        />
        <div className="flex gap-2">
          <a
            href="/chamado"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-accent/40 px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent/10"
          >
            🌐 Portal público
          </a>
          <Button onClick={() => { setEditing(emptyOS(state.nextOS)); setIsNew(true); }}>
            <PlusIcon /> Nova OS
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState emoji="🛠️" title="Nenhuma ordem de serviço" desc="Abra uma OS para acompanhar o reparo do início ao fim." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((o) => {
            const idx = FLOW.indexOf(o.status);
            const progress = o.status === "Cancelada" ? 0 : Math.round(((idx + 1) / FLOW.length) * 100);
            const dias = daysBetween(o.criadaEm, todayISO());
            return (
              <Card key={o.id} glow className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--color-${statusTone[o.status]})` }} />
                    <span className="font-mono text-xs font-bold text-ink">{o.numero}</span>
                    {o.origem === "cliente" && <Badge tone="info">chamado</Badge>}
                  </div>
                  <Badge tone={prioTone[o.prioridade]} dot>{o.prioridade}</Badge>
                </div>
                <div className="mt-2 font-semibold text-ink">{o.cliente}</div>
                <div className="text-xs text-muted">{o.equipamento}{o.marca ? ` • ${o.marca}` : ""}</div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{o.problema || "—"}</p>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-muted">
                    <span className="font-semibold" style={{ color: `var(--color-${statusTone[o.status]})` }}>{o.status}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface3">
                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: o.status === "Cancelada" ? "var(--color-bad)" : "linear-gradient(90deg,#7c4dff,#c840e0)" }} />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <div className="text-xs text-muted">
                    <span className="font-semibold text-ink">{brl(o.valor)}</span> • {dias}d aberta
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="subtle" onClick={() => setViewing({ ...o })}>Detalhes</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...o, fotos: [...o.fotos] }); setIsNew(false); }}><EditIcon /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.numero} — ${viewing.cliente}` : ""}
        size="xl"
        footer={
          viewing && (
            <>
              {OS_STATUS_FLOW[viewing.status] && OS_STATUS_FLOW[viewing.status] !== viewing.status && (
                <Button onClick={() => advance(viewing)}>➡ Avançar para {OS_STATUS_FLOW[viewing.status]}</Button>
              )}
              <Button variant="subtle" onClick={() => registerClient(viewing)}>👤 Cadastrar cliente</Button>
              <Button variant="danger" onClick={() => remove(viewing)}><TrashIcon /></Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="space-y-4">
            {/* Flow stepper */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {FLOW.map((st, i) => {
                const cur = FLOW.indexOf(viewing.status);
                const done = i <= cur && viewing.status !== "Cancelada";
                return (
                  <div key={st} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full items-center">
                      <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done ? "bg-accent" : "bg-line"}`} />
                      <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done ? "bg-gradient-accent text-white" : "bg-surface3 text-muted"}`}>{i + 1}</div>
                      <div className={`h-0.5 flex-1 ${i === FLOW.length - 1 ? "opacity-0" : done && i < cur ? "bg-accent" : "bg-line"}`} />
                    </div>
                    <span className={`text-center text-[9px] ${done ? "text-ink" : "text-muted"}`}>{st}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[viewing.status]} dot>{viewing.status}</Badge>
              <Badge tone={prioTone[viewing.prioridade]}>{viewing.prioridade}</Badge>
              <Badge tone={viewing.origem === "cliente" ? "info" : "neutral"}>{viewing.origem === "cliente" ? "origem: cliente" : "interna"}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <Select className="w-44" value={viewing.status} onChange={(e) => changeStatus(viewing, e.target.value)}>
                  {OS_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info label="Equipamento" value={viewing.equipamento} />
              <Info label="Marca / Modelo" value={`${viewing.marca || "—"} / ${viewing.modelo || "—"}`} />
              <Info label="Tipo" value={viewing.tipo} />
              <Info label="Telefone" value={viewing.tel || "—"} />
              <Info label="Aberta em" value={fmtDate(viewing.criadaEm)} />
              <Info label="Prazo" value={viewing.prazo ? fmtDate(viewing.prazo) : "—"} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Box label="Problema relatado" value={viewing.problema} />
              <Box label="Diagnóstico" value={viewing.diagnostico} />
              <Box label="Solução aplicada" value={viewing.solucao} />
              <Box label="Peças utilizadas" value={viewing.pecas} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase text-muted">Fotos</span>
                <label className="cursor-pointer text-xs font-semibold text-accent hover:underline">
                  + Anexar
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUpload(viewing, e.target.files)} />
                </label>
              </div>
              {viewing.fotos.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma foto anexada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {viewing.fotos.map((f, i) => (
                    <img key={i} src={f} alt="" className="h-20 w-20 rounded-lg border border-line object-cover" />
                  ))}
                </div>
              )}
            </div>

            {/* Link de acompanhamento */}
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
              <div className="mb-1 text-xs font-bold uppercase text-accent">🔗 Portal do cliente</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/acompanhar/${viewing.numero}${
                    viewing.tokenAcesso ? `?token=${viewing.tokenAcesso}` : ""
                  }`}
                  className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-muted"
                />
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    const url = `${window.location.origin}/acompanhar/${viewing.numero}${
                      viewing.tokenAcesso ? `?token=${viewing.tokenAcesso}` : ""
                    }`;
                    navigator.clipboard.writeText(url);
                    toast.push("Link copiado!");
                  }}
                >
                  Copiar link
                </Button>
                <a
                  href={`/acompanhar/${viewing.numero}${
                    viewing.tokenAcesso ? `?token=${viewing.tokenAcesso}` : ""
                  }`}
                  target="_blank"
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface2"
                >
                  Abrir portal
                </a>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={!!viewing.notifyWhatsApp}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      update((d) => {
                        const t = d.os.find((x) => x.id === viewing.id);
                        if (t) t.notifyWhatsApp = checked;
                      });
                      setViewing({ ...viewing, notifyWhatsApp: checked });
                    }}
                  />
                  Notificar via WhatsApp
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={!!viewing.notifyEmail}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      update((d) => {
                        const t = d.os.find((x) => x.id === viewing.id);
                        if (t) t.notifyEmail = checked;
                      });
                      setViewing({ ...viewing, notifyEmail: checked });
                    }}
                  />
                  Notificar via E-mail
                </label>
                <span>• Token: <code className="text-accent">{viewing.tokenAcesso || "—"}</code></span>
              </div>
            </div>

            {/* Chat */}
            <div className="rounded-xl border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="text-xs font-bold uppercase text-muted">💬 Mensagens com o cliente</span>
                <span className="text-[10px] text-muted">{(viewing.mensagens || []).length} mensagens</span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto p-3">
                {(!viewing.mensagens || viewing.mensagens.length === 0) && (
                  <p className="text-center text-xs text-muted">Nenhuma mensagem ainda.</p>
                )}
                {(viewing.mensagens || []).map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs ${
                      m.autor === "tecnico"
                        ? "ml-auto bg-accent/25"
                        : m.autor === "sistema"
                        ? "mx-auto bg-surface3 text-center text-muted"
                        : "bg-surface3"
                    }`}
                  >
                    <div className="mb-0.5 text-[10px] opacity-70">
                      {m.nome} • {new Date(m.data).toLocaleString("pt-BR")}
                    </div>
                    {m.texto}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t border-line p-2">
                <input
                  id="os-chat-input"
                  placeholder="Escreva para o cliente..."
                  className="min-w-0 flex-1 rounded-lg border border-line bg-base px-3 py-2 text-xs text-ink outline-none focus:border-accent/60"
                  onKeyDown={(e) => {
                    const el = e.currentTarget as HTMLInputElement;
                    if (e.key === "Enter" && el.value.trim()) {
                      const texto = el.value.trim();
                      el.value = "";
                      // send
                      fetch(`/api/public/os/${encodeURIComponent(viewing.numero)}/message`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          texto,
                          nome: "Equipe GBR",
                          autor: "tecnico",
                          token: "tecnico",
                        }),
                      })
                        .then((r) => r.json())
                        .then((d) => {
                          if (d.mensagem) {
                            update((dd) => {
                              const t = dd.os.find((x) => x.id === viewing.id);
                              if (t) {
                                if (!t.mensagens) t.mensagens = [];
                                t.mensagens.push(d.mensagem);
                              }
                            });
                            setViewing((v) =>
                              v
                                ? {
                                    ...v,
                                    mensagens: [...(v.mensagens || []), d.mensagem],
                                  }
                                : v
                            );
                            toast.push("Mensagem enviada ao cliente");
                          }
                        });
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const el = document.getElementById("os-chat-input") as HTMLInputElement;
                    if (el && el.value.trim()) {
                      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                    }
                  }}
                >
                  Enviar
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase text-muted">Histórico</div>
              <div className="space-y-2">
                {[...viewing.historico].reverse().map((h, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <span className="text-muted">{fmtDate(h.data)} — </span>
                      <span className="text-ink">{h.texto}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Nova OS" : `Editar ${editing?.numero ?? ""}`}
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
            <Field label="Equipamento"><Input value={editing.equipamento} onChange={(e) => setEditing({ ...editing, equipamento: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Marca"><Input value={editing.marca} onChange={(e) => setEditing({ ...editing, marca: e.target.value })} /></Field>
              <Field label="Modelo"><Input value={editing.modelo} onChange={(e) => setEditing({ ...editing, modelo: e.target.value })} /></Field>
            </div>
            <Field label="Tipo"><Select value={editing.tipo} onChange={(e) => setEditing({ ...editing, tipo: e.target.value })}>{state.categorias.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
            <Field label="Prioridade"><Select value={editing.prioridade} onChange={(e) => setEditing({ ...editing, prioridade: e.target.value })}>{["Normal", "Alta", "Urgente"].map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
            <Field label="Valor (R$)"><Input type="number" min={0} step="0.01" value={editing.valor} onChange={(e) => setEditing({ ...editing, valor: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Prazo"><Input type="date" value={editing.prazo} onChange={(e) => setEditing({ ...editing, prazo: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Problema relatado"><Textarea rows={2} value={editing.problema} onChange={(e) => setEditing({ ...editing, problema: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Diagnóstico"><Textarea rows={2} value={editing.diagnostico} onChange={(e) => setEditing({ ...editing, diagnostico: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Solução"><Textarea rows={2} value={editing.solucao} onChange={(e) => setEditing({ ...editing, solucao: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Peças"><Input value={editing.pecas} onChange={(e) => setEditing({ ...editing, pecas: e.target.value })} /></Field></div>
          </div>
        )}
      </Modal>

      {node}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted">{label}</div>
      <div className="text-sm font-medium text-ink">{value || "—"}</div>
    </div>
  );
}
function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-[10px] uppercase text-muted">{label}</div>
      <div className="mt-1 text-sm text-ink">{value || "—"}</div>
    </div>
  );
}
