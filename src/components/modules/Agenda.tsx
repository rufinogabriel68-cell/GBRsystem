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
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  EditIcon,
  SectionTitle,
} from "@/components/ui";
import { MonthCalendar, TIPO_TONE } from "@/components/MonthCalendar";
import { fmtDate, uid, todayISO } from "@/lib/utils";
import type { Agenda as AgendaItem } from "@/lib/types";

const TIPOS = ["Serviço", "Instalação", "Orçamento", "Comercial", "Pessoal"];

function emptyAg(): AgendaItem {
  return { id: uid(), dia: todayISO(), titulo: "", hora: "09:00", status: "Aguardando", tipo: "Serviço", obs: "" };
}

export function Agenda() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [selDay, setSelDay] = useState<string>(todayISO());

  const dayItems = state.agenda
    .filter((a) => a.dia === selDay)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  function save() {
    if (!editing) return;
    if (!editing.titulo.trim()) { toast.push("Informe o título.", "error"); return; }
    const a = editing;
    update((d) => {
      const idx = d.agenda.findIndex((x) => x.id === a.id);
      if (idx >= 0) d.agenda[idx] = a; else { d.agenda.push(a); d.nextAg += 1; }
    });
    toast.push(isNew ? "Compromisso criado." : "Compromisso atualizado.");
    setSelDay(a.dia);
    setEditing(null);
  }
  async function remove(a: AgendaItem) {
    if (await confirm(`Excluir "${a.titulo}"?`)) {
      update((d) => { d.agenda = d.agenda.filter((x) => x.id !== a.id); });
      toast.push("Compromisso excluído.", "info");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing({ ...emptyAg(), dia: selDay }); setIsNew(true); }}><PlusIcon /> Novo compromisso</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card glow className="p-5">
          <MonthCalendar events={state.agenda.map((a) => ({ dia: a.dia, tipo: a.tipo }))} selectedDay={selDay} onSelectDay={setSelDay} />
          <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-3">
            {TIPOS.map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: `var(--color-${TIPO_TONE[t] ?? "neutral"})` }} />{t}
              </span>
            ))}
          </div>
        </Card>

        <Card glow className="p-5">
          <SectionTitle sub={fmtDate(selDay)}>Compromissos do dia</SectionTitle>
          {dayItems.length === 0 ? (
            <EmptyState emoji="📅" title="Nenhum compromisso" desc="Selecione um dia e adicione um compromisso." action={<Button size="sm" onClick={() => { setEditing({ ...emptyAg(), dia: selDay }); setIsNew(true); }}><PlusIcon /> Adicionar</Button>} />
          ) : (
            <div className="space-y-2">
              {dayItems.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                  <span className="h-9 w-1 rounded-full" style={{ background: `var(--color-${TIPO_TONE[a.tipo] ?? "neutral"})` }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{a.hora}</span>
                      <Badge tone={TIPO_TONE[a.tipo] ?? "neutral"}>{a.tipo}</Badge>
                    </div>
                    <div className="truncate text-sm font-semibold text-ink">{a.titulo}</div>
                    {a.obs && <div className="truncate text-xs text-muted">{a.obs}</div>}
                  </div>
                  <button
                    onClick={() => update((d) => { const t = d.agenda.find((x) => x.id === a.id); if (t) t.status = t.status === "Confirmado" ? "Aguardando" : "Confirmado"; })}
                    title="Alternar status"
                  >
                    <Badge tone={a.status === "Confirmado" ? "good" : "warn"} dot>{a.status}</Badge>
                  </button>
                  <div className="flex gap-0.5">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...a }); setIsNew(false); }}><EditIcon /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(a)}><TrashIcon /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Novo compromisso" : "Editar compromisso"} size="md"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {editing && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Título"><Input value={editing.titulo} onChange={(e) => setEditing({ ...editing, titulo: e.target.value })} /></Field></div>
            <Field label="Dia"><Input type="date" value={editing.dia} onChange={(e) => setEditing({ ...editing, dia: e.target.value })} /></Field>
            <Field label="Hora"><Input type="time" value={editing.hora} onChange={(e) => setEditing({ ...editing, hora: e.target.value })} /></Field>
            <Field label="Tipo"><Select value={editing.tipo} onChange={(e) => setEditing({ ...editing, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Status"><Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>{["Confirmado", "Aguardando"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <div className="sm:col-span-2"><Field label="Observações"><Textarea rows={2} value={editing.obs} onChange={(e) => setEditing({ ...editing, obs: e.target.value })} /></Field></div>
          </div>
        )}
      </Modal>
      {node}
    </div>
  );
}
