"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Textarea,
  Progress,
  useConfirm,
  useToast,
  PlusIcon,
  TrashIcon,
  EditIcon,
} from "@/components/ui";
import { fmtDate, uid } from "@/lib/utils";
import type { Nota } from "@/lib/types";

const NOTE_COLORS: Record<string, string> = {
  azul: "#38bdf8",
  verde: "#2ecc71",
  amarelo: "#ffb020",
  roxo: "#7c4dff",
  turquesa: "#22d3ee",
  rosa: "#c840e0",
  vermelho: "#ff5470",
};
const COLOR_KEYS = Object.keys(NOTE_COLORS);

function emptyNota(): Nota {
  return { id: uid(), titulo: "", texto: "", cor: "roxo", fixada: false, data: new Date().toISOString().slice(0, 10), checklist: [] };
}

export function Notes() {
  const { state, update } = useStore();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [editing, setEditing] = useState<Nota | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newItem, setNewItem] = useState("");

  const sorted = [...state.notas].sort((a, b) => Number(b.fixada) - Number(a.fixada));

  function save() {
    if (!editing) return;
    if (!editing.titulo.trim() && !editing.texto.trim()) { toast.push("Escreva algo na nota.", "error"); return; }
    const n = editing;
    update((d) => {
      const idx = d.notas.findIndex((x) => x.id === n.id);
      if (idx >= 0) d.notas[idx] = n; else { d.notas.unshift(n); d.nextNota += 1; }
    });
    toast.push(isNew ? "Nota criada." : "Nota atualizada.");
    setEditing(null);
  }
  async function remove(n: Nota) {
    if (await confirm(`Excluir a nota "${n.titulo || "sem título"}"?`)) {
      update((d) => { d.notas = d.notas.filter((x) => x.id !== n.id); });
      toast.push("Nota excluída.", "info");
    }
  }
  function togglePin(n: Nota) {
    update((d) => { const t = d.notas.find((x) => x.id === n.id); if (t) t.fixada = !t.fixada; });
  }
  function toggleCheck(n: Nota, itemId: string) {
    update((d) => { const t = d.notas.find((x) => x.id === n.id); const it = t?.checklist.find((c) => c.id === itemId); if (it) it.ok = !it.ok; });
  }
  function addCheckInline(n: Nota, texto: string) {
    if (!texto.trim()) return;
    update((d) => { const t = d.notas.find((x) => x.id === n.id); if (t) t.checklist.push({ id: uid(), texto, ok: false }); });
    setNewItem("");
  }
  function removeCheck(n: Nota, itemId: string) {
    update((d) => { const t = d.notas.find((x) => x.id === n.id); if (t) t.checklist = t.checklist.filter((c) => c.id !== itemId); });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 fade-up">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(emptyNota()); setIsNew(true); }}><PlusIcon /> Nova nota</Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState emoji="📝" title="Nenhuma nota" desc="Crie notas e checklists para organizar seu dia a dia." action={<Button onClick={() => { setEditing(emptyNota()); setIsNew(true); }}><PlusIcon /> Criar primeira nota</Button>} />
      ) : (
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-3">
          {sorted.map((n) => {
            const color = NOTE_COLORS[n.cor] ?? NOTE_COLORS.roxo;
            const done = n.checklist.filter((c) => c.ok).length;
            return (
              <div
                key={n.id}
                className="break-inside-avoid rounded-2xl border border-line bg-surface p-4 shadow-lg transition hover:shadow-accent/10"
                style={{ borderTop: `3px solid ${color}` }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-ink">{n.titulo || "Sem título"}</h3>
                  <div className="flex gap-0.5">
                    <button onClick={() => togglePin(n)} title="Fixar" className={`px-1 ${n.fixada ? "text-warn" : "text-line hover:text-muted"}`}>📌</button>
                    <button onClick={() => { setEditing({ ...n, checklist: n.checklist.map((c) => ({ ...c })) }); setIsNew(false); }} className="px-1 text-muted hover:text-ink"><EditIcon /></button>
                    <button onClick={() => remove(n)} className="px-1 text-muted hover:text-bad"><TrashIcon /></button>
                  </div>
                </div>
                {n.texto && <p className="whitespace-pre-wrap text-sm text-muted">{n.texto}</p>}

                {n.checklist.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted">
                      <span>{done}/{n.checklist.length} concluídos</span>
                      <span>{Math.round((done / n.checklist.length) * 100)}%</span>
                    </div>
                    <Progress value={done} max={n.checklist.length} tone="accent" className="h-1.5" />
                  </div>
                )}

                <div className="mt-2 space-y-1">
                  {n.checklist.map((c) => (
                    <div key={c.id} className="group flex items-center gap-2 text-sm">
                      <button onClick={() => toggleCheck(n, c.id)} className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${c.ok ? "border-transparent text-white" : "border-line"}`} style={{ background: c.ok ? color : "transparent" }}>
                        {c.ok && <span className="text-[10px]">✓</span>}
                      </button>
                      <span className={`flex-1 ${c.ok ? "text-muted line-through" : "text-ink"}`}>{c.texto}</span>
                      <button onClick={() => removeCheck(n, c.id)} className="opacity-0 transition group-hover:opacity-100 text-muted hover:text-bad">✕</button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-1">
                  <Input className="h-8 py-1 text-xs" value={n.id === editing?.id ? newItem : ""} placeholder="+ adicionar item" onChange={(e) => { setEditing(n); setNewItem(e.target.value); }} onKeyDown={(e) => { if (e.key === "Enter") { setEditing(n); addCheckInline(n, newItem); } }} />
                </div>

                <div className="mt-2 text-[10px] text-muted">{fmtDate(n.data)}</div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Nova nota" : "Editar nota"} size="md"
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
        {editing && (
          <div className="space-y-3">
            <Field label="Título"><Input value={editing.titulo} onChange={(e) => setEditing({ ...editing, titulo: e.target.value })} /></Field>
            <Field label="Texto"><Textarea rows={3} value={editing.texto} onChange={(e) => setEditing({ ...editing, texto: e.target.value })} /></Field>
            <Field label="Cor">
              <div className="flex flex-wrap gap-2">
                {COLOR_KEYS.map((c) => (
                  <button key={c} onClick={() => setEditing({ ...editing, cor: c })} className={`h-8 w-8 rounded-full border-2 transition ${editing.cor === c ? "scale-110 border-white" : "border-transparent"}`} style={{ background: NOTE_COLORS[c] }} />
                ))}
              </div>
            </Field>
            <div>
              <div className="mb-1.5 text-xs uppercase text-muted">Checklist</div>
              <div className="space-y-1">
                {editing.checklist.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Input className="h-8 py-1 text-xs" value={c.texto} onChange={(e) => setEditing({ ...editing, checklist: editing.checklist.map((x) => x.id === c.id ? { ...x, texto: e.target.value } : x) })} />
                    <button onClick={() => setEditing({ ...editing, checklist: editing.checklist.filter((x) => x.id !== c.id) })} className="text-muted hover:text-bad"><TrashIcon /></button>
                  </div>
                ))}
                <button onClick={() => setEditing({ ...editing, checklist: [...editing.checklist, { id: uid(), texto: "", ok: false }] })} className="flex items-center gap-1 text-xs font-semibold text-accent"><PlusIcon /> Item</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {node}
    </div>
  );
}
