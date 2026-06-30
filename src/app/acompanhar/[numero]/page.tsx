"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

type OsData = {
  numero: string;
  cliente: string;
  equipamento: string;
  marca: string;
  modelo: string;
  tipo: string;
  problema: string;
  diagnostico: string;
  solucao: string;
  status: string;
  prioridade: string;
  data: string;
  prazo: string;
  valor: number;
  fotos: string[];
  historico: { data: string; texto: string }[];
  tokenAcesso?: string;
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
};

type Msg = { id: string; autor: "cliente" | "tecnico" | "sistema"; nome: string; texto: string; data: string; lida: boolean };
type Garantia = any;

const STATUS_FLOW = ["Aberta", "Diagnóstico", "Em Execução", "Aguardando Peça", "Concluída", "Entregue"];
const statusColor: Record<string, string> = { Aberta: "#38bdf8", Diagnóstico: "#a78bfa", "Em Execução": "#7c4dff", "Aguardando Peça": "#ffb020", Concluída: "#2ecc71", Entregue: "#22d3ee", Cancelada: "#ff5470" };

export default function AcompanharPage() {
  const params = useParams<{ numero: string }>();
  const search = useSearchParams();
  const numero = decodeURIComponent(params.numero || "");
  const tokenFromUrl = search.get("token") || "";

  const [os, setOs] = useState<OsData | null>(null);
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [garantia, setGarantia] = useState<Garantia>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needAuth, setNeedAuth] = useState(true);
  const [authMethod, setAuthMethod] = useState<"tel" | "email">("tel");
  const [authValue, setAuthValue] = useState("");

  const [msgText, setMsgText] = useState("");
  const [nomeLocal, setNomeLocal] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function load(value = authValue, method = authMethod) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (tokenFromUrl) qs.set("token", tokenFromUrl);
      if (method === "tel" && value) qs.set("tel", value.replace(/\D/g, "").slice(-4));
      if (method === "email" && value) qs.set("token", value.trim());
      const res = await fetch(`/api/public/os/${encodeURIComponent(numero)}?${qs}`);
      const data = await res.json();
      if (data.needAuth) {
        setNeedAuth(true);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Erro");
      setOs(data.os);
      setMensagens(data.mensagens || []);
      setGarantia(data.garantia);
      setNeedAuth(false);
      if (data.os?.cliente && !nomeLocal) setNomeLocal(data.os.cliente.split(" ")[0]);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenFromUrl) load("", "tel");
  }, [numero, tokenFromUrl]);

  useEffect(() => {
    if (!os || needAuth) return;
    const id = setInterval(() => load(authValue, authMethod), 20000);
    return () => clearInterval(id);
  }, [os?.numero, authValue, authMethod, needAuth]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  async function sendMessage() {
    if (!msgText.trim() || !os) return;
    try {
      const res = await fetch(`/api/public/os/${encodeURIComponent(os.numero)}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: msgText, nome: nomeLocal || os.cliente, autor: "cliente" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensagens((m) => [...m, data.mensagem]);
      setMsgText("");
    } catch (e: any) { alert(e.message || "Erro ao enviar"); }
  }

  if (needAuth) {
    return (
      <div className="min-h-screen bg-base text-ink flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface2 p-7 shadow-2xl">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-accent text-2xl">🔒</div>
            <h1 className="font-display text-xl font-bold">Verificar acesso</h1>
            <p className="text-xs text-muted">OS {numero}</p>
          </div>
          <div className="mb-3 flex gap-2 text-xs font-semibold">
            <button onClick={() => setAuthMethod("tel")} className={`flex-1 rounded-lg py-2 ${authMethod === "tel" ? "bg-accent/20 text-accent" : "text-muted"}`}>Final do celular</button>
            <button onClick={() => setAuthMethod("email")} className={`flex-1 rounded-lg py-2 ${authMethod === "email" ? "bg-accent/20 text-accent" : "text-muted"}`}>E-mail</button>
          </div>
          <input
            value={authValue}
            onChange={(e) => setAuthValue(authMethod === "tel" ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value)}
            placeholder={authMethod === "tel" ? "Últimos 4 dígitos" : "E-mail cadastrado"}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="mb-3 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent/60"
          />
          {error && <div className="mb-3 rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-xs text-bad">{error}</div>}
          <button onClick={() => load()} disabled={loading || !authValue} className="w-full rounded-xl bg-gradient-accent py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Verificando..." : "Acessar OS"}</button>
          <div className="mt-4 text-center"><Link href="/chamado" className="text-xs text-muted hover:text-ink">← Voltar ao portal</Link></div>
        </div>
      </div>
    );
  }

  if (loading && !os) return <div className="min-h-screen bg-base flex items-center justify-center text-muted">Carregando...</div>;
  if (!os) return <div className="min-h-screen bg-base flex items-center justify-center text-bad">{error || "OS não encontrada"}</div>;

  const curIdx = STATUS_FLOW.indexOf(os.status);
  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-lg">🛠️</div>
            <div>
              <div className="font-display text-sm font-extrabold text-gradient">GBR OS</div>
              <div className="text-[11px] text-muted">Acompanhamento do cliente</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-ink">{numero}</div>
            <Link href="/chamado" className="text-[11px] text-accent hover:underline">Abrir novo chamado →</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-line bg-surface2 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase text-muted">Status atual</div>
                  <div className="font-display text-xl font-extrabold" style={{ color: statusColor[os.status] || "#ece9fb" }}>{os.status}</div>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${os.prioridade === "Urgente" ? "#ff5470" : "#9b95c0"}22`, color: os.prioridade === "Urgente" ? "#ff5470" : "#9b95c0" }}>{os.prioridade}</span>
              </div>
              <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
                {STATUS_FLOW.map((st, i) => {
                  const done = curIdx >= i && os.status !== "Cancelada";
                  return (
                    <div key={st} className="flex min-w-[86px] flex-1 flex-col items-center">
                      <div className="flex w-full items-center">
                        <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : done ? "bg-accent" : "bg-[#2c2754]"}`} />
                        <div className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${done ? "bg-gradient-accent text-white" : "bg-surface3 text-muted"} ${i === curIdx ? "ring-2 ring-accent/50" : ""}`}>{i + 1}</div>
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
                <KV k="Cliente" v={os.cliente} />
                <KV k="Equipamento" v={os.equipamento + (os.marca ? ` • ${os.marca} ${os.modelo}` : "")} />
                <KV k="Tipo" v={os.tipo} />
                <KV k="Aberto em" v={os.data} />
                {os.valor > 0 && <KV k="Valor" v={new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(os.valor)} />}
              </div>
              <div className="mt-3"><div className="text-[10px] uppercase text-muted">Problema relatado</div><div className="text-sm text-ink">{os.problema}</div></div>
              {os.diagnostico && <div className="mt-3"><div className="text-[10px] uppercase text-muted">Diagnóstico</div><div className="text-sm text-ink">{os.diagnostico}</div></div>}
              {os.solucao && <div className="mt-3"><div className="text-[10px] uppercase text-muted">Solução</div><div className="text-sm text-good">{os.solucao}</div></div>}
              {os.fotos?.length > 0 && <div className="mt-4"><div className="mb-2 text-[10px] uppercase text-muted">Fotos</div><div className="flex flex-wrap gap-2">{os.fotos.map((f, i) => <img key={i} src={f} className="h-20 w-20 rounded-lg border border-line object-cover" alt="" />)}</div></div>}
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
                <a href={`https://wa.me/5511988881234?text=${encodeURIComponent(`Olá! Estou acompanhando a OS ${os.numero} - ${os.cliente}`)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-[#25D366] px-3 py-2.5 text-center text-sm font-semibold text-white">💬 WhatsApp</a>
                <a href="tel:+5511988881234" className="rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-sm font-semibold hover:bg-surface3">📞 Ligar</a>
              </div>
            </div>
            <div className="flex h-[420px] flex-col rounded-2xl border border-line bg-surface2">
              <div className="border-b border-line px-4 py-3 text-sm font-bold">Mensagens</div>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {mensagens.length === 0 && <p className="text-center text-xs text-muted">Nenhuma mensagem ainda.</p>}
                {mensagens.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${m.autor === "cliente" ? "ml-auto bg-accent/25 text-ink" : m.autor === "sistema" ? "mx-auto bg-surface3 text-muted text-center" : "bg-surface3 text-ink"}`}>
                    <div className="mb-0.5 text-[10px] opacity-70">{m.nome} • {new Date(m.data).toLocaleString("pt-BR")}</div>
                    <div>{m.texto}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-line p-2">
                <div className="flex gap-2">
                  <input value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Escreva uma mensagem..." className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent/60" />
                  <button onClick={sendMessage} disabled={!msgText.trim()} className="rounded-xl bg-gradient-accent px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Enviar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return <div><div className="text-[10px] uppercase text-muted">{k}</div><div className="text-sm font-medium text-ink">{v}</div></div>;
}
