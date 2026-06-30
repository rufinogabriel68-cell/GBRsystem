"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CATEGORIAS = [
  "Informática",
  "Formatação",
  "Rede / Wi-Fi",
  "CFTV / Câmeras",
  "Elétrica",
  "TV / Suporte",
  "Notebook",
  "Automação",
  "Outro",
];

type FormData = {
  nome: string;
  whatsapp: string;
  email: string;
  endereco: string;
  tipoServico: string;
  equipamento: string;
  marcaModelo: string;
  descricao: string;
  urgente: boolean;
  fotos: string[];
  notifyWhatsApp: boolean;
  notifyEmail: boolean;
};

type ViewMode = "buscar" | "acompanhar" | "novo";

export default function ChamadoPage() {
  const [mode, setMode] = useState<ViewMode>("buscar");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Busca
  const [buscaNumero, setBuscaNumero] = useState("");
  const [buscaContato, setBuscaContato] = useState("");
  const [buscaTipo, setBuscaTipo] = useState<"tel" | "email">("tel");
  const [osEncontrada, setOsEncontrada] = useState<any>(null);

  // Novo chamado
  const [f, setF] = useState<FormData>({
    nome: "",
    whatsapp: "",
    email: "",
    endereco: "",
    tipoServico: "Informática",
    equipamento: "",
    marcaModelo: "",
    descricao: "",
    urgente: false,
    fotos: [],
    notifyWhatsApp: true,
    notifyEmail: false,
  });
  const [result, setResult] = useState<{
    numero: string;
    tokenAcesso: string;
    cliente: string;
    _offline?: boolean;
  } | null>(null);

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  async function buscarOS(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setOsEncontrada(null);
    try {
      const numero = buscaNumero.trim().toUpperCase();
      if (!numero) throw new Error("Informe o número da OS");
      if (!buscaContato.trim()) throw new Error("Informe o telefone ou e-mail vinculado");

      const qs = new URLSearchParams();
      if (buscaTipo === "tel") qs.set("tel", buscaContato.replace(/\D/g, "").slice(-4));
      else qs.set("token", buscaContato.trim());

      const res = await fetch(`/api/public/os/${encodeURIComponent(numero)}?${qs}`);
      const data = await res.json();
      if (!res.ok || data.needAuth) throw new Error("OS não encontrada ou contato não confere.");
      setOsEncontrada(data);
      setMode("acompanhar");
    } catch (err: any) {
      setError(err.message || "Erro ao buscar");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    setError("");
    if (step === 1) {
      if (!f.nome.trim() || !f.whatsapp.trim() || !f.endereco.trim()) {
        setError("Preencha nome, WhatsApp e endereço.");
        return;
      }
    }
    if (step === 2) {
      if (!f.descricao.trim() || f.descricao.trim().length < 10) {
        setError("Descreva o problema com pelo menos 10 caracteres.");
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const remain = 5 - f.fotos.length;
    const batch = Array.from(files).slice(0, remain);
    for (const file of batch) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        setF((s) => ({ ...s, fotos: [...s.fotos, dataUrl].slice(0, 5) }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  // Fila offline
  function openOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("gbr_os_offline", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("pending_chamados", { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function saveToOfflineQueue(data: any) {
    const db = await openOfflineDB();
    const tx = db.transaction("pending_chamados", "readwrite");
    tx.objectStore("pending_chamados").put({ id: Date.now().toString(), ...data });
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync?.register("sync-chamado");
    }
  }
  async function syncPending() {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction("pending_chamados", "readonly");
      const all = await new Promise<any[]>((resolve) => {
        const req = tx.objectStore("pending_chamados").getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
      });
      for (const chamado of all) {
        try {
          const res = await fetch("/api/public/os", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chamado),
          });
          if (res.ok) {
            const dTx = db.transaction("pending_chamados", "readwrite");
            dTx.objectStore("pending_chamados").delete(chamado.id);
          }
        } catch {}
      }
    } catch {}
  }
  useEffect(() => {
    syncPending();
    const handler = () => syncPending();
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, []);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setResult(data.os);
    } catch (err: any) {
      try {
        await saveToOfflineQueue(f);
        setResult({
          numero: "PENDENTE",
          tokenAcesso: "offline",
          cliente: f.nome,
          _offline: true,
        } as any);
      } catch {
        setError("Sem conexão. Tente novamente quando estiver online.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Telas
  if (mode === "acompanhar" && osEncontrada) {
    const o = osEncontrada.os;
    const garantia = osEncontrada.garantia;
    const mensagens = osEncontrada.mensagens || [];
    return (
      <div className="min-h-screen bg-base text-ink">
        <header className="border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-lg">🛠️</div>
              <div>
                <div className="font-display text-sm font-extrabold text-gradient">GBR OS</div>
                <div className="text-[11px] text-muted">Acompanhamento</div>
              </div>
            </div>
            <button onClick={() => { setMode("buscar"); setOsEncontrada(null); setBuscaContato(""); }} className="text-xs text-muted hover:text-ink">← Voltar</button>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">
          <AcompanhamentoContent o={o} garantia={garantia} mensagens={mensagens} />
        </main>
      </div>
    );
  }

  if (result) {
    if (result._offline) {
      return (
        <div className="min-h-screen bg-base text-ink flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-3xl border border-warn/40 bg-warn/10 p-7 text-center">
            <div className="text-4xl mb-3">📴</div>
            <h1 className="font-display text-2xl font-bold text-warn">Sem conexão</h1>
            <p className="text-sm text-muted mt-2">Seu chamado foi salvo no dispositivo e será enviado automaticamente quando você voltar a ficar online.</p>
            <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-gradient-accent px-5 py-2.5 text-sm font-bold text-white">Tentar novamente</button>
          </div>
        </div>
      );
    }
    const waText = encodeURIComponent(
      `Olá! Abri o chamado ${result.numero}.\nCliente: ${result.cliente}\nAcompanhar: ${typeof window !== "undefined" ? window.location.origin : ""}/acompanhar/${result.numero}?token=${result.tokenAcesso}`
    );
    return (
      <div className="min-h-screen bg-base text-ink">
        <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
          <div className="w-full rounded-3xl border border-line bg-surface2 p-7 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-accent text-2xl">✅</div>
            <h1 className="font-display text-2xl font-extrabold text-good">Chamado aberto!</h1>
            <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 font-mono text-lg font-bold text-accent">{result.numero}</div>
            <p className="mt-4 text-sm text-muted">
              Recebemos seu chamado. Você receberá atualizações via {f.notifyWhatsApp ? "WhatsApp" : ""}{f.notifyWhatsApp && f.notifyEmail ? " e " : ""}{f.notifyEmail ? "E-mail" : ""}.
            </p>
            <div className="mt-6 grid gap-3">
              <Link href={`/acompanhar/${result.numero}?token=${result.tokenAcesso}`} className="rounded-xl bg-gradient-accent px-5 py-4 text-center text-base font-bold text-white shadow-xl">
                🔎 Acompanhar status do serviço
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/5511988881234?text=${waText}`} target="_blank" rel="noreferrer" className="rounded-xl border border-line bg-surface px-3 py-3 text-center text-sm font-semibold text-ink hover:bg-surface3">💬 WhatsApp</a>
                <button onClick={() => window.location.reload()} className="rounded-xl border border-line bg-surface px-3 py-3 text-center text-sm font-semibold text-ink hover:bg-surface3">➕ Novo chamado</button>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-left text-xs text-muted">
              <p className="font-semibold text-accent">📌 Salve este link:</p>
              <p className="mt-1 break-all text-[11px]">{typeof window !== "undefined" ? window.location.origin : ""}/acompanhar/{result.numero}?token={result.tokenAcesso}</p>
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/acompanhar/${result.numero}?token=${result.tokenAcesso}`)} className="mt-2 text-xs font-semibold text-accent underline">Copiar link</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "novo") {
    return (
      <div className="min-h-screen bg-base text-ink">
        <header className="border-b border-line bg-surface/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-lg">🛠️</div>
              <div>
                <div className="font-display text-sm font-extrabold text-gradient">GBR OS</div>
                <div className="text-[11px] text-muted">Abrir chamado técnico</div>
              </div>
            </div>
            <button onClick={() => setMode("buscar")} className="text-xs text-muted hover:text-ink">← Voltar</button>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          <div className="mb-4 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span className={step >= 1 ? "text-accent" : ""}>1. Seus dados</span>
              <span className={step >= 2 ? "text-accent" : ""}>2. Problema</span>
              <span className={step >= 3 ? "text-accent" : ""}>3. Confirmar</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface3">
              <div className="h-full rounded-full bg-gradient-accent transition-all" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface2 p-5 shadow-xl">
            {step === 1 && (
              <div className="space-y-4 fade-up">
                <h2 className="font-display text-lg font-bold">Seus dados</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <L label="Nome completo *"><I value={f.nome} onChange={(v) => update("nome", v)} placeholder="Seu nome" /></L>
                  <L label="WhatsApp *"><I value={f.whatsapp} onChange={(v) => update("whatsapp", v)} placeholder="(11) 9...." /></L>
                  <L label="E-mail (opcional)"><I type="email" value={f.email} onChange={(v) => update("email", v)} placeholder="voce@email.com" /></L>
                  <L label="Endereço / Bairro *"><I value={f.endereco} onChange={(v) => update("endereco", v)} placeholder="Rua, número, bairro" /></L>
                </div>
                <div className="flex flex-wrap gap-4 pt-2 text-xs">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={f.notifyWhatsApp} onChange={(e) => update("notifyWhatsApp", e.target.checked)} /> Receber atualizações no WhatsApp</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={f.notifyEmail} onChange={(e) => update("notifyEmail", e.target.checked)} /> Receber por E-mail</label>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4 fade-up">
                <h2 className="font-display text-lg font-bold">Descreva o problema</h2>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Tipo de serviço</div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS.map((c) => (
                      <button key={c} onClick={() => update("tipoServico", c)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${f.tipoServico === c ? "border-accent bg-accent/15 text-ink" : "border-line bg-surface text-muted hover:border-accent/40"}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <L label="Equipamento (opcional)"><I value={f.equipamento} onChange={(v) => update("equipamento", v)} placeholder="Ex: Notebook, TV..." /></L>
                  <L label="Marca / Modelo (opcional)"><I value={f.marcaModelo} onChange={(v) => update("marcaModelo", v)} placeholder="Ex: Dell Inspiron" /></L>
                </div>
                <L label="Descrição do problema *">
                  <textarea value={f.descricao} onChange={(e) => update("descricao", e.target.value)} rows={4} placeholder="Descreva com detalhes o que está acontecendo..." className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/30" />
                  <div className="mt-1 text-right text-[11px] text-muted">{f.descricao.length} caracteres</div>
                </L>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Fotos do problema (até 5)</div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface px-4 py-4 text-sm text-muted hover:border-accent/50">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
                    📷 Adicionar fotos ({f.fotos.length}/5)
                  </label>
                  {f.fotos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {f.fotos.map((src, i) => (
                        <div key={i} className="relative">
                          <img src={src} className="h-16 w-16 rounded-lg border border-line object-cover" alt="" />
                          <button type="button" onClick={() => update("fotos", f.fotos.filter((_, j) => j !== i))} className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-bad text-[10px] text-white">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${f.urgente ? "border-bad/50 bg-bad/10" : "border-line bg-surface"}`}>
                  <div>
                    <div className="text-sm font-semibold text-ink">⚡ Atendimento urgente</div>
                    <div className="text-xs text-muted">Marque se precisa de atendimento prioritário</div>
                  </div>
                  <input type="checkbox" checked={f.urgente} onChange={(e) => update("urgente", e.target.checked)} className="h-5 w-5 accent-red-500" />
                </label>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4 fade-up">
                <h2 className="font-display text-lg font-bold">Confirme seus dados</h2>
                <div className="grid gap-3 rounded-xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
                  <KV k="Nome" v={f.nome} />
                  <KV k="WhatsApp" v={f.whatsapp} />
                  <KV k="E-mail" v={f.email || "—"} />
                  <KV k="Endereço" v={f.endereco} />
                  <KV k="Serviço" v={f.tipoServico} />
                  <KV k="Equipamento" v={`${f.equipamento} ${f.marcaModelo}`.trim() || "—"} />
                  <KV k="Urgência" v={f.urgente ? "⚡ Urgente" : "Normal"} />
                  <div className="sm:col-span-2"><KV k="Problema" v={f.descricao} /></div>
                </div>
                <div className="rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-xs text-info">Seus dados serão utilizados exclusivamente para atendimento técnico, conforme LGPD.</div>
              </div>
            )}
            {error && <div className="mt-4 rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}
            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || loading} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface disabled:opacity-40">← Voltar</button>
              {step < 3 ? (
                <button onClick={next} className="rounded-xl bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg">Continuar →</button>
              ) : (
                <button onClick={submit} disabled={loading} className="rounded-xl bg-gradient-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60">{loading ? "Enviando..." : "Enviar chamado"}</button>
              )}
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted">Atendimento técnico profissional • Resposta em até 2h úteis</p>
        </main>
      </div>
    );
  }

  // Tela inicial: buscar OS
  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-lg">🛠️</div>
            <div>
              <div className="font-display text-sm font-extrabold text-gradient">GBR OS</div>
              <div className="text-[11px] text-muted">Portal do cliente</div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-10">
        <div className="rounded-3xl border border-line bg-surface2 p-7 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-accent text-2xl">🔎</div>
            <h1 className="font-display text-2xl font-extrabold text-ink">Acompanhar chamado</h1>
            <p className="mt-1 text-sm text-muted">Digite o número da OS e confirme com o telefone ou e-mail cadastrado.</p>
          </div>

          <form onSubmit={buscarOS} className="space-y-4">
            <L label="Número da OS">
              <I value={buscaNumero} onChange={(v) => setBuscaNumero(v.toUpperCase())} placeholder="Ex: OS-0001" />
            </L>

            <div>
              <div className="mb-2 flex gap-2 text-xs font-semibold">
                <button type="button" onClick={() => setBuscaTipo("tel")} className={`rounded-lg px-3 py-1.5 ${buscaTipo === "tel" ? "bg-accent/20 text-accent" : "text-muted"}`}>Final do celular</button>
                <button type="button" onClick={() => setBuscaTipo("email")} className={`rounded-lg px-3 py-1.5 ${buscaTipo === "email" ? "bg-accent/20 text-accent" : "text-muted"}`}>E-mail</button>
              </div>
              {buscaTipo === "tel" ? (
                <L label="Últimos 4 dígitos do celular">
                  <I value={buscaContato} onChange={(v) => setBuscaContato(v.replace(/\D/g, "").slice(0, 4))} placeholder="0000" />
                </L>
              ) : (
                <L label="E-mail cadastrado">
                  <I type="email" value={buscaContato} onChange={(v) => setBuscaContato(v)} placeholder="voce@email.com" />
                </L>
              )}
            </div>

            {error && <div className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gradient-accent px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">
              {loading ? "Buscando..." : "Buscar OS"}
            </button>
          </form>

          <div className="mt-6 border-t border-line pt-6 text-center">
            <p className="mb-3 text-xs text-muted">Ainda não abriu seu chamado?</p>
            <button onClick={() => setMode("novo")} className="rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface3">
              ➕ Abrir novo chamado
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente de acompanhamento
function AcompanhamentoContent({ o, garantia, mensagens }: { o: any; garantia: any; mensagens: any[] }) {
  const STATUS_FLOW = ["Aberta", "Diagnóstico", "Em Execução", "Aguardando Peça", "Concluída", "Entregue"];
  const statusColor: Record<string, string> = {
    Aberta: "#38bdf8", Diagnóstico: "#a78bfa", "Em Execução": "#7c4dff", "Aguardando Peça": "#ffb020", Concluída: "#2ecc71", Entregue: "#22d3ee", Cancelada: "#ff5470",
  };
  const curIdx = STATUS_FLOW.indexOf(o.status);
  const [msgText, setMsgText] = useState("");
  const [listaMsg, setListaMsg] = useState(mensagens);

  async function enviarMsg() {
    if (!msgText.trim()) return;
    const res = await fetch(`/api/public/os/${encodeURIComponent(o.numero)}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: msgText, nome: o.cliente, autor: "cliente" }),
    });
    const data = await res.json();
    if (data.mensagem) {
      setListaMsg((m) => [...m, data.mensagem]);
      setMsgText("");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-line bg-surface2 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase text-muted">Status atual</div>
              <div className="font-display text-xl font-extrabold" style={{ color: statusColor[o.status] || "#ece9fb" }}>{o.status}</div>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${o.prioridade === "Urgente" ? "#ff5470" : "#9b95c0"}22`, color: o.prioridade === "Urgente" ? "#ff5470" : "#9b95c0" }}>{o.prioridade}</span>
          </div>
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_FLOW.map((st, i) => {
              const done = curIdx >= i && o.status !== "Cancelada";
              return (
                <div key={st} className="flex min-w-[86px] flex-1 flex-col items-center">
                  <div className="flex w-full items-center">
                    <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done ? "bg-accent" : "bg-[#2c2754]"}`} />
                    <div className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${done ? "bg-gradient-accent text-white" : "bg-surface3 text-muted"}`}>{i + 1}</div>
                    <div className={`h-0.5 flex-1 ${i === STATUS_FLOW.length - 1 ? "opacity-0" : done && i < curIdx ? "bg-accent" : "bg-[#2c2754]"}`} />
                  </div>
                  <span className={`mt-1 text-center text-[9px] ${done ? "text-ink" : "text-muted"}`}>{st}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface2 p-5">
          <h3 className="mb-3 font-display text-sm font-bold">Detalhes do serviço</h3>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <KV k="Cliente" v={o.cliente} />
            <KV k="Equipamento" v={o.equipamento + (o.marca ? ` • ${o.marca} ${o.modelo}` : "")} />
            <KV k="Tipo" v={o.tipo} />
            <KV k="Aberto em" v={o.data} />
            {o.valor > 0 && <KV k="Valor" v={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.valor)} />}
          </div>
          <div className="mt-3"><div className="text-[10px] uppercase text-muted">Problema relatado</div><div className="text-sm text-ink">{o.problema}</div></div>
          {o.diagnostico && <div className="mt-3"><div className="text-[10px] uppercase text-muted">Diagnóstico</div><div className="text-sm text-ink">{o.diagnostico}</div></div>}
          {o.solucao && <div className="mt-3"><div className="text-[10px] uppercase text-muted">Solução</div><div className="text-sm text-good">{o.solucao}</div></div>}
          {o.fotos?.length > 0 && <div className="mt-4"><div className="mb-2 text-[10px] uppercase text-muted">Fotos</div><div className="flex flex-wrap gap-2">{o.fotos.map((f: string, i: number) => <img key={i} src={f} className="h-20 w-20 rounded-lg border border-line object-cover" alt="" />)}</div></div>}
        </div>
      </div>

      <div className="space-y-4">
        {garantia && (
          <div className="rounded-2xl border border-line bg-surface2 p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">🛡️ Garantia</div>
            <div className={`text-2xl font-extrabold ${garantia.vencida ? "text-bad" : garantia.proxima ? "text-warn" : "text-good"}`}>{garantia.vencida ? "Vencida" : `${garantia.diasRestantes}d restantes`}</div>
            <div className="mt-1 text-xs text-muted">Válida até {garantia.fim}</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface3"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (garantia.diasRestantes / garantia.dias) * 100 || 0))}%`, background: garantia.vencida ? "#ff5470" : garantia.proxima ? "#ffb020" : "#2ecc71" }} /></div>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-surface2 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Contato rápido</div>
          <div className="grid gap-2">
            <a href={`https://wa.me/5511988881234?text=${encodeURIComponent(`Olá! Estou acompanhando a OS ${o.numero} - ${o.cliente}`)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366] px-3 py-2.5 text-center text-sm font-semibold text-white">💬 WhatsApp</a>
            <a href="tel:+5511988881234" className="rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-sm font-semibold hover:bg-surface3">📞 Ligar</a>
          </div>
        </div>

        <div className="flex h-[420px] flex-col rounded-2xl border border-line bg-surface2">
          <div className="border-b border-line px-4 py-3 text-sm font-bold">Mensagens</div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {listaMsg.length === 0 && <p className="text-center text-xs text-muted">Nenhuma mensagem ainda.</p>}
            {listaMsg.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${m.autor === "cliente" ? "ml-auto bg-accent/25 text-ink" : m.autor === "sistema" ? "mx-auto bg-surface3 text-muted text-center" : "bg-surface3 text-ink"}`}>
                <div className="mb-0.5 text-[10px] opacity-70">{m.nome} • {new Date(m.data).toLocaleString("pt-BR")}</div>
                <div>{m.texto}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-line p-2">
            <div className="flex gap-2">
              <input value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") enviarMsg(); }} placeholder="Escreva uma mensagem..." className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent/60" />
              <button onClick={enviarMsg} className="rounded-xl bg-gradient-accent px-3 py-2 text-xs font-bold text-white disabled:opacity-50" disabled={!msgText.trim()}>Enviar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>{children}</label>;
}
function I({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent/70 focus:ring-2 focus:ring-accent/30" />;
}
function KV({ k, v }: { k: string; v: string }) {
  return <div><div className="text-[10px] uppercase text-muted">{k}</div><div className="text-sm font-medium text-ink">{v}</div></div>;
}
