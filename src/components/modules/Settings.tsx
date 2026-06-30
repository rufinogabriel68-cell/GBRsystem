"use client";

import { useStore } from "@/lib/store";
import {
  Button,
  Card,
  Field,
  Input,
  SectionTitle,
  useConfirm,
  useToast,
} from "@/components/ui";
import { createSeedState } from "@/lib/seed";
import { brl } from "@/lib/utils";

function CfgField({ label, value, onChange, suffix }: { label: string; value: string | number; onChange: (v: string) => void; suffix?: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

export function Settings() {
  const { state, update, reload, saveStatus } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const cfg = state.cfg;

  const set = (patch: Partial<typeof cfg>) => update((d) => { Object.assign(d.cfg, patch); });
  const setMq = (key: keyof typeof cfg.maquininha, v: number) =>
    update((d) => { d.cfg.maquininha[key] = v; });

  const days = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const metaDiaria = cfg.metaMensal / days;

  async function resetDemo() {
    if (await confirm("Restaurar todos os dados para o conjunto de demonstração? Suas alterações serão perdidas.")) {
      update((d) => {
        const seed = createSeedState();
        seed.page = d.page;
        Object.assign(d, seed);
      });
      toast.push("Dados de demonstração restaurados.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 fade-up">
      {/* Company */}
      <Card glow className="p-5">
        <SectionTitle sub="Identidade exibida em documentos e PDFs">Dados da empresa</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <CfgField label="Nome" value={cfg.empresa} onChange={(v) => set({ empresa: v })} />
          <CfgField label="Subtítulo" value={cfg.sub} onChange={(v) => set({ sub: v })} />
          <CfgField label="CNPJ" value={cfg.cnpj} onChange={(v) => set({ cnpj: v })} />
          <CfgField label="Telefone" value={cfg.tel} onChange={(v) => set({ tel: v })} />
          <div className="sm:col-span-2"><CfgField label="Cidade" value={cfg.cidade} onChange={(v) => set({ cidade: v })} /></div>
        </div>
      </Card>

      {/* Goals */}
      <Card glow className="p-5">
        <SectionTitle sub="Metas financeiras">Metas</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <CfgField label="Meta mensal (R$)" value={cfg.metaMensal} onChange={(v) => set({ metaMensal: parseFloat(v) || 0 })} />
          <CfgField label="Meta semanal (R$)" value={cfg.metaSemanal} onChange={(v) => set({ metaSemanal: parseFloat(v) || 0 })} />
          <CfgField label="Meta anual (R$)" value={cfg.metaAnual} onChange={(v) => set({ metaAnual: parseFloat(v) || 0 })} />
        </div>
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          Meta diária sugerida: <span className="font-bold text-accent">{brl(metaDiaria)}</span>
        </div>
      </Card>

      {/* Machine rates */}
      <Card glow className="p-5">
        <SectionTitle sub="Taxas da maquininha para a calculadora">Taxas de cartão (%)</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Débito"><Input type="number" step="0.01" value={cfg.maquininha.debito} onChange={(e) => setMq("debito", parseFloat(e.target.value) || 0)} /></Field>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
            const key = `credito${n}` as keyof typeof cfg.maquininha;
            return (
              <Field key={n} label={`Crédito ${n}x`}>
                <Input type="number" step="0.01" value={cfg.maquininha[key]} onChange={(e) => setMq(key, parseFloat(e.target.value) || 0)} />
              </Field>
            );
          })}
        </div>
      </Card>

      {/* Operational */}
      <Card glow className="p-5">
        <SectionTitle sub="Impostos e custos operacionais">Operacional</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Imposto MEI (%)"><Input type="number" step="0.01" value={cfg.impostoMEI} onChange={(e) => set({ impostoMEI: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Imposto NF (%)"><Input type="number" step="0.01" value={cfg.impostoNF} onChange={(e) => set({ impostoNF: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Deslocamento base (R$)"><Input type="number" step="0.01" value={cfg.deslBase} onChange={(e) => set({ deslBase: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="KM extra (R$/km)"><Input type="number" step="0.01" value={cfg.deslKmExtra} onChange={(e) => set({ deslKmExtra: parseFloat(e.target.value) || 0 })} /></Field>
          <Field label="Urgência padrão (%)"><Input type="number" step="0.01" value={cfg.urgencial} onChange={(e) => set({ urgencial: parseFloat(e.target.value) || 0 })} /></Field>
        </div>
      </Card>

      {/* Sync */}
      <Card glow className="p-5">
        <SectionTitle sub="Status da conexão com o banco de dados">Sincronização</SectionTitle>
        <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${saveStatus === "saving" || saveStatus === "loading" ? "dot-pulse bg-warn" : saveStatus === "offline" || saveStatus === "error" ? "bg-bad" : "bg-good"}`} />
            <span className="text-ink capitalize">{saveStatus === "saved" ? "Conectado e sincronizado" : saveStatus === "offline" ? "Modo offline" : saveStatus}</span>
          </div>
          <Button variant="subtle" size="sm" onClick={() => reload()}>🔄 Recarregar</Button>
        </div>
      </Card>

      {/* Notificações reais */}
      <Card glow className="p-5">
        <SectionTitle sub="Configure Twilio (WhatsApp) e Resend (E-mail) para notificar clientes automaticamente">🔔 Notificações ao cliente</SectionTitle>
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <h4 className="font-display font-bold text-ink">💬 WhatsApp via Twilio</h4>
            <p className="text-muted text-xs">Para enviar mensagens automáticas no WhatsApp quando o status de uma OS mudar, crie uma conta no <a href="https://www.twilio.com/try-twilio" target="_blank" className="text-accent underline">Twilio</a> e ative o canal WhatsApp Business.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><span className="text-[10px] uppercase text-muted">TWILIO_ACCOUNT_SID</span><div className="text-xs text-accent font-mono">variável de ambiente</div></div>
              <div><span className="text-[10px] uppercase text-muted">TWILIO_AUTH_TOKEN</span><div className="text-xs text-accent font-mono">variável de ambiente</div></div>
              <div><span className="text-[10px] uppercase text-muted">TWILIO_WHATSAPP_FROM</span><div className="text-xs font-mono text-muted">ex: whatsapp:+14155238886</div></div>
              <div><span className="text-[10px] uppercase text-muted">NEXT_PUBLIC_BASE_URL</span><div className="text-xs font-mono text-muted">ex: https://seudominio.com</div></div>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
            <h4 className="font-display font-bold text-ink">📧 E-mail via Resend</h4>
            <p className="text-muted text-xs">Para enviar e-mails automáticos com atualização de status, crie uma conta no <a href="https://resend.com/signup" target="_blank" className="text-accent underline">Resend</a> e configure um domínio.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><span className="text-[10px] uppercase text-muted">RESEND_API_KEY</span><div className="text-xs text-accent font-mono">variável de ambiente</div></div>
              <div><span className="text-[10px] uppercase text-muted">RESEND_FROM</span><div className="text-xs font-mono text-muted">ex: GBR OS &lt;onboarding@seucom.com&gt;</div></div>
            </div>
          </div>
          <div className="rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-xs text-info">
            <strong>Sem configuração:</strong> As notificações funcionam em modo simulado — o sistema registra no console e mostra toast no painel. Configure as variáveis acima no arquivo <code className="text-accent">.env</code> para ativar o envio real.
          </div>
        </div>
      </Card>

      {/* App & Infra */}
      <Card glow className="p-5">
        <SectionTitle sub="Como transformar este sistema em app celular, desktop e multi-dispositivo com sync">📱 App & Infraestrutura</SectionTitle>
        <div className="space-y-4 text-sm">

          <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
            <h4 className="font-display font-bold text-ink">📲 Instalar como App no Celular (PWA)</h4>
            <p className="text-xs text-muted">Este sistema já é um <strong>Progressive Web App (PWA)</strong>. Para instalar:</p>
            <ul className="list-disc pl-5 text-xs text-muted space-y-1">
              <li><strong>Android Chrome:</strong> Toque no menu ⋮ → "Instalar app" ou "Adicionar à tela inicial"</li>
              <li><strong>iPhone Safari:</strong> Toque no ícone Compartilhar → "Adicionar à Tela de Início"</li>
              <li><strong>Desktop Chrome/Edge:</strong> Clique no ícone de instalação na barra de endereço ou menu → "Instalar GBR OS"</li>
            </ul>
            <p className="text-xs text-muted mt-2">O app funciona <strong>offline</strong> com cache automático. Chamados abertos sem internet são enfileirados e sincronizados quando a conexão retorna.</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
            <h4 className="font-display font-bold text-ink">🖥️ App Desktop (Electron / Tauri)</h4>
            <p className="text-xs text-muted">Para empacotar como aplicativo nativo para Windows/Mac/Linux:</p>
            <div className="rounded-lg bg-base p-3 font-mono text-[11px] text-accent overflow-x-auto">
              <div># Opção 1 — Electron (mais compatível)</div>
              <div>npx create-electron-app gbr-os-desktop</div>
              <div># Aponte o BrowserWindow para seu servidor ou index.html</div>
              <div className="mt-2"># Opção 2 — Tauri (mais leve, 5MB)</div>
              <div>npm create tauri-app@latest</div>
              <div># Configure o webview para carregar a URL do sistema</div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
            <h4 className="font-display font-bold text-ink">🔄 Sync Multi-Dispositivo (Local-First)</h4>
            <p className="text-xs text-muted">Arquitetura recomendada para que múltiplos dispositivos (celular, PC, notebook) sincronizem entre si, mesmo com um dispositivo "host" que pode ficar offline:</p>
            <div className="mt-2 space-y-2 text-xs text-muted">
              <div className="flex gap-2"><span className="text-accent font-bold shrink-0">Camada 1</span> <span><strong>Service Worker + IndexedDB</strong> (já implementado) — cada dispositivo salva localmente antes de enviar ao servidor. Chamados criados offline ficam na fila e são sincronizados automaticamente quando a conexão retorna.</span></div>
              <div className="flex gap-2"><span className="text-accent font-bold shrink-0">Camada 2</span> <span><strong>Polling + Merge</strong> (já implementado) — a cada 8s o painel consulta o servidor e mescla OS novas que chegaram de outros dispositivos (via portal público ou outros terminais).</span></div>
              <div className="flex gap-2"><span className="text-accent font-bold shrink-0">Camada 3</span> <span><strong>WebSocket (próximo passo)</strong> — para sync instantâneo entre dispositivos, adicione Socket.io ou Supabase Realtime. Quando o "host" voltar online, ele emite um evento e todos os outros dispositivos recebem a atualização em tempo real.</span></div>
              <div className="flex gap-2"><span className="text-accent font-bold shrink-0">Camada 4</span> <span><strong>CRDT (avançado)</strong> — para conflitos complexos (dois dispositivos editando a mesma OS simultaneamente), use Yjs ou Automerge. Cada dispositivo mantém um documento local e as mudanças se propagam e se mesclam automaticamente quando os dispositivos se reconectam.</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
            <h4 className="font-display font-bold text-accent">🏠 Hospedagem Local (Self-Hosted)</h4>
            <p className="text-xs text-muted">Para rodar o sistema no próprio computador ou servidor local:</p>
            <div className="rounded-lg bg-base p-3 font-mono text-[11px] text-accent overflow-x-auto mt-2">
              <div># 1. Instale Node.js 20+ e PostgreSQL</div>
              <div># 2. Clone o projeto</div>
              <div>git clone [repo] && cd gbr-os</div>
              <div>npm install</div>
              <div className="mt-1"># 3. Configure o .env</div>
              <div>DATABASE_URL=postgresql://user:pass@localhost:5432/gbr_os</div>
              <div className="mt-1"># 4. Suba o banco e rode</div>
              <div>npx drizzle-kit push</div>
              <div>npm run build && npm start</div>
              <div className="mt-1"># Acesse: http://localhost:3000</div>
              <div># Outros dispositivos na mesma rede: http://SEU-IP:3000</div>
            </div>
            <p className="text-xs text-muted mt-2">O sistema funciona 100% offline dentro da rede local. Para acesso externo, use Cloudflare Tunnel ou ngrok.</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
            <h4 className="font-display font-bold text-ink">📡 Arquitetura P2P (Visão Futura)</h4>
            <p className="text-xs text-muted">Para sincronização direta entre dispositivos sem servidor central:</p>
            <ul className="list-disc pl-5 text-xs text-muted space-y-1">
              <li><strong>PeerJS / WebRTC</strong> — conexão direta navegador-a-navegador</li>
              <li><strong>Dispositivo Host</strong> — um dispositivo atua como "líder" e mantém o banco principal</li>
              <li><strong>Quando o host está offline</strong> — outros dispositivos salvam localmente (IndexedDB) e, ao detectar que o host voltou, enviam as mudanças pendentes</li>
              <li><strong>Resolução de conflitos</strong> — timestamp + last-write-wins ou CRDT para mesclagem automática</li>
              <li><strong>Descoberta</strong> — mDNS na rede local ou servidor de sinalização na nuvem para encontrar peers</li>
            </ul>
          </div>

        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-bad/30 p-5">
        <SectionTitle sub="Restaura os dados de exemplo do sistema">Zona de perigo</SectionTitle>
        <Button variant="danger" onClick={resetDemo}>♻️ Restaurar dados de demonstração</Button>
      </Card>

      {node}
    </div>
  );
}
