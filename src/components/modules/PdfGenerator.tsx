"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Select,
  useToast,
  type Tone,
} from "@/components/ui";
import * as M from "@/lib/metrics";
import { brl, fmtDate, num, pct } from "@/lib/utils";

type Kind = "orcamento" | "recibo" | "laudo" | "relatorio";
const TEMPLATES: { id: Kind; label: string; icon: string; desc: string; tone: Tone }[] = [
  { id: "orcamento", label: "Orçamento", icon: "📋", desc: "Proposta comercial com tabela de serviços", tone: "accent" },
  { id: "recibo", label: "Recibo", icon: "🧾", desc: "Comprovante de pagamento", tone: "good" },
  { id: "laudo", label: "Laudo Técnico", icon: "🔬", desc: "Relatório técnico de serviço", tone: "info" },
  { id: "relatorio", label: "Relatório Mensal", icon: "📊", desc: "Resumo financeiro e operacional", tone: "warn" },
];

const PURPLE: [number, number, number] = [124, 77, 255];
const MAGENTA: [number, number, number] = [200, 64, 224];
const DARK: [number, number, number] = [20, 16, 42];
const MUT: [number, number, number] = [110, 104, 140];

export function PdfGenerator() {
  const { state } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("orcamento");
  const [busy, setBusy] = useState(false);

  const [orcId, setOrcId] = useState(state.orc[0]?.id ?? "");
  const [validade, setValidade] = useState("15 dias");
  const [cond, setCond] = useState("50% na aprovação e 50% na entrega. Aceito PIX e cartão.");

  const [recValor, setRecValor] = useState(state.orc[0]?.valor ?? 0);
  const [recPagador, setRecPagador] = useState(state.orc[0]?.cliente ?? "");
  const [recForma, setRecForma] = useState("PIX");
  const [recRef, setRecRef] = useState("");
  const [recObs, setRecObs] = useState("");

  const [osId, setOsId] = useState(state.os[0]?.id ?? "");
  const [laudoGar, setLaudoGar] = useState("90 dias");

  const [metaMes, setMetaMes] = useState("");

  useEffect(() => {
    if (kind === "orcamento" && state.orc[0]) setOrcId(state.orc[0].id);
    if (kind === "laudo" && state.os[0]) setOsId(state.os[0].id);
  }, [kind, state.orc, state.os]);

  async function gerar() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      const cfg = state.cfg;

      const header = (title: string) => {
        doc.setFillColor(...PURPLE);
        doc.rect(0, 0, 210, 30, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text(cfg.empresa, 14, 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(cfg.sub, 14, 19);
        doc.text(`${cfg.cnpj}  •  ${cfg.tel}  •  ${cfg.cidade}`, 14, 24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(title, 196, 13, { align: "right" });
      };
      const footer = () => {
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          doc.setPage(i);
          doc.setFontSize(7.5);
          doc.setTextColor(...MUT);
          doc.text(`${cfg.empresa} • ${cfg.cnpj}`, 14, 290);
          doc.text(`Gerado em ${fmtDate(new Date().toISOString().slice(0, 10))}`, 196, 290, { align: "right" });
        }
      };
      const label = (x: number, y: number, k: string, v: string) => {
        doc.setFontSize(8);
        doc.setTextColor(...MUT);
        doc.text(k.toUpperCase(), x, y);
        doc.setFontSize(10);
        doc.setTextColor(...DARK);
        doc.text(v || "—", x, y + 5);
      };

      if (kind === "orcamento") {
        const o = state.orc.find((x) => x.id === orcId);
        header("ORÇAMENTO");
        let y = 44;
        doc.setDrawColor(...MAGENTA); doc.setLineWidth(0.5);
        doc.setFillColor(244, 240, 255); doc.roundedRect(14, y - 6, 182, 20, 2, 2, "FD");
        label(18, y, "Cliente", o?.cliente ?? "");
        label(110, y, "Data", fmtDate(o?.data ?? ""));
        label(18, y + 11, "Telefone", o?.tel ?? "");
        label(110, y + 11, "Status", o?.status ?? "");
        autoTable(doc, {
          startY: y + 22,
          head: [["Serviço", "Qtd", "Valor unit.", "Subtotal"]],
          body: (o?.itens.length ? o.itens : [{ nome: o?.tipo ?? "Serviço", qtd: 1, valor: o?.valor ?? 0 }]).map((it) => [
            it.nome, String(it.qtd), brl(it.valor), brl(it.valor * it.qtd),
          ]),
          theme: "grid",
          headStyles: { fillColor: PURPLE, textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 9, textColor: DARK },
          styles: { cellPadding: 2.5 },
        });
        // @ts-expect-error lastAutoTable is injected by plugin
        let yt = (doc.lastAutoTable?.finalY ?? y + 40) + 8;
        doc.setFillColor(...MAGENTA); doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.roundedRect(120, yt, 76, 12, 2, 2, "F");
        doc.text(`TOTAL: ${brl(o?.valor ?? 0)}`, 158, yt + 8, { align: "center" });
        yt += 20;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...DARK);
        const condLines = doc.splitTextToSize(`Condições: ${cond}`, 182);
        doc.text(condLines, 14, yt); yt += condLines.length * 5 + 2;
        doc.text(`Validade: ${validade}`, 14, yt); yt += 8;
        doc.text("Assinatura empresa: ______________________", 14, yt + 14);
        doc.text("Assinatura cliente: ______________________", 110, yt + 14);
        footer();
        doc.save(`orcamento-${(o?.cliente ?? "cliente").replace(/\s/g, "-").toLowerCase()}.pdf`);
      } else if (kind === "recibo") {
        header("RECIBO");
        let y = 52;
        doc.setTextColor(...MUT); doc.setFontSize(9);
        doc.text("Recebi(emos) de:", 14, y);
        doc.setTextColor(...DARK); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text(recPagador || "—", 14, y + 7);
        y += 20;
        doc.setFillColor(244, 240, 255); doc.setDrawColor(...MAGENTA);
        doc.roundedRect(14, y, 182, 26, 3, 3, "FD");
        doc.setTextColor(...MUT); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.text("O VALOR DE", 80, y + 8, { align: "center" });
        doc.setTextColor(...MAGENTA); doc.setFont("helvetica", "bold"); doc.setFontSize(24);
        doc.text(brl(recValor), 105, y + 19, { align: "center" });
        y += 38;
        label(14, y, "Forma de pagamento", recForma);
        label(110, y, "Referência", recRef);
        if (recObs) { y += 14; doc.setTextColor(...DARK); doc.setFontSize(9); doc.text(doc.splitTextToSize(`Observações: ${recObs}`, 182), 14, y); }
        doc.setLineWidth(0.3); doc.setDrawColor(...MUT);
        doc.line(14, 250, 90, 250); doc.line(116, 250, 196, 250);
        doc.setFontSize(8); doc.setTextColor(...MUT);
        doc.text("Assinatura", 50, 255, { align: "center" });
        doc.text("Assinatura", 156, 255, { align: "center" });
        footer();
        doc.save("recibo.pdf");
      } else if (kind === "laudo") {
        const o = state.os.find((x) => x.id === osId);
        header("LAUDO TÉCNICO");
        let y = 42;
        label(14, y, "Cliente", o?.cliente ?? ""); label(110, y, "OS", o?.numero ?? "");
        label(14, y + 11, "Equipamento", o?.equipamento ?? ""); label(110, y + 11, "Marca/Modelo", `${o?.marca ?? ""} / ${o?.modelo ?? ""}`);
        label(14, y + 22, "Data", fmtDate(o?.data ?? "")); label(110, y + 22, "Valor", brl(o?.valor ?? 0));
        y += 36;
        const blocks: [string, string][] = [
          ["Problema relatado", o?.problema ?? ""],
          ["Diagnóstico técnico", o?.diagnostico ?? ""],
          ["Solução aplicada", o?.solucao ?? ""],
          ["Peças utilizadas", o?.pecas ?? ""],
        ];
        for (const [k, v] of blocks) {
          doc.setFontSize(8); doc.setTextColor(...MUT); doc.text(k.toUpperCase(), 14, y);
          y += 5;
          doc.setFontSize(9.5); doc.setTextColor(...DARK);
          const lines = doc.splitTextToSize(v || "—", 182);
          doc.text(lines, 14, y);
          y += lines.length * 5 + 6;
        }
        doc.setFillColor(244, 240, 255); doc.roundedRect(14, y, 182, 12, 2, 2, "F");
        doc.setTextColor(...MAGENTA); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        doc.text(`Garantia: ${laudoGar}`, 18, y + 8);
        doc.setLineWidth(0.3); doc.setDrawColor(...MUT);
        doc.line(14, 270, 90, 270); doc.line(116, 270, 196, 270);
        doc.setFontSize(8); doc.setTextColor(...MUT);
        doc.text("Técnico responsável", 50, 275, { align: "center" });
        doc.text("Cliente", 156, 275, { align: "center" });
        footer();
        doc.save(`laudo-${(o?.numero ?? "os").replace(/\s/g, "")}.pdf`);
      } else {
        header("RELATÓRIO MENSAL");
        let y = 42;
        const fat = M.faturamento(state), gastos = M.totalGastos(state), rec = M.totalRecExtras(state);
        const liquido = fat + rec - gastos;
        const cards: [string, string, [number, number, number]][] = [
          ["Faturamento", brl(fat), PURPLE],
          ["Receitas extras", brl(rec), [56, 189, 248]],
          ["Gastos", brl(gastos), [255, 84, 112]],
          ["Resultado", brl(liquido), [46, 204, 112]],
        ];
        cards.forEach((c, i) => {
          const x = 14 + (i % 2) * 92;
          const yy = y + Math.floor(i / 2) * 22;
          doc.setFillColor(245, 243, 252); doc.roundedRect(x, yy, 86, 18, 2, 2, "F");
          doc.setTextColor(...MUT); doc.setFontSize(7.5); doc.text(c[0].toUpperCase(), x + 4, yy + 6);
          doc.setTextColor(...c[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(c[1], x + 4, yy + 14);
        });
        y += 54;
        // meta bar
        doc.setTextColor(...DARK); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text(`Meta mensal: ${brl(state.cfg.metaMensal)}  (${pct(M.metaProgress(state) * 100)})`, 14, y);
        doc.setFillColor(230, 226, 245); doc.roundedRect(14, y + 3, 182, 6, 2, 2, "F");
        doc.setFillColor(...PURPLE); doc.roundedRect(14, y + 3, Math.min(182, 182 * M.metaProgress(state)), 6, 2, 2, "F");
        y += 16;
        autoTable(doc, {
          startY: y,
          head: [["Ordens de serviço", "Status", "Valor"]],
          body: state.os.slice(0, 8).map((o) => [`${o.numero} • ${o.cliente}`, o.status, brl(o.valor)]),
          theme: "striped",
          headStyles: { fillColor: DARK, textColor: 255, fontSize: 8.5 },
          bodyStyles: { fontSize: 8.5, textColor: DARK },
          styles: { cellPadding: 2 },
        });
        // @ts-expect-error injected
        let yt = (doc.lastAutoTable?.finalY ?? y) + 6;
        autoTable(doc, {
          startY: yt,
          head: [["Principais gastos", "Valor"]],
          body: [...state.gastos].sort((a, b) => b.valor - a.valor).slice(0, 6).map((g) => [g.desc, brl(g.valor)]),
          theme: "striped",
          headStyles: { fillColor: [255, 84, 112], textColor: 255, fontSize: 8.5 },
          bodyStyles: { fontSize: 8.5, textColor: DARK },
          styles: { cellPadding: 2 },
        });
        // @ts-expect-error injected
        yt = (doc.lastAutoTable?.finalY ?? yt) + 10;
        doc.setTextColor(...DARK); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text("Análise e próximos passos", 14, yt); yt += 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        const analise = doc.splitTextToSize(
          `Margem líquida de ${pct(M.margemPct(state))} e ticket médio de ${brl(M.ticketMedio(state))}. ` +
          `${num(state.os.length)} ordens registradas, ${num(M.osAtivas(state).length)} em andamento. ` +
          `Taxa de aprovação de ${pct(M.taxaAprovacao(state))}. ${metaMes || "Foque em conversão de orçamentos e follow-ups pendentes."}`,
          182
        );
        doc.text(analise, 14, yt);
        footer();
        doc.save("relatorio-mensal.pdf");
      }
      toast.push("PDF gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.push("Erro ao gerar PDF.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 fade-up">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => setKind(t.id)} className={`rounded-2xl border p-4 text-left transition ${kind === t.id ? "border-accent bg-accent/10" : "border-line bg-surface hover:bg-surface2"}`}>
            <div className="text-2xl">{t.icon}</div>
            <div className="mt-1 font-display text-sm font-bold text-ink">{t.label}</div>
            <div className="mt-0.5 text-xs text-muted">{t.desc}</div>
          </button>
        ))}
      </div>

      <Card glow className="p-5">
        {kind === "orcamento" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Orçamento"><Select value={orcId} onChange={(e) => setOrcId(e.target.value)}>{state.orc.length === 0 ? <option>Nenhum orçamento</option> : state.orc.map((o) => <option key={o.id} value={o.id}>{o.cliente} — {brl(o.valor)}</option>)}</Select></Field>
            <Field label="Validade"><Input value={validade} onChange={(e) => setValidade(e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Condições de pagamento"><Textarea rows={2} value={cond} onChange={(e) => setCond(e.target.value)} /></Field></div>
          </div>
        )}
        {kind === "recibo" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Pagador"><Input value={recPagador} onChange={(e) => setRecPagador(e.target.value)} /></Field>
            <Field label="Valor (R$)"><Input type="number" min={0} step="0.01" value={recValor} onChange={(e) => setRecValor(parseFloat(e.target.value) || 0)} /></Field>
            <Field label="Forma de pagamento"><Select value={recForma} onChange={(e) => setRecForma(e.target.value)}>{["PIX", "Dinheiro", "Débito", "Crédito", "Transferência", "Boleto"].map((f) => <option key={f}>{f}</option>)}</Select></Field>
            <Field label="Referência"><Input value={recRef} onChange={(e) => setRecRef(e.target.value)} placeholder="Ex.: OS-0001" /></Field>
            <div className="sm:col-span-2"><Field label="Observações"><Textarea rows={2} value={recObs} onChange={(e) => setRecObs(e.target.value)} /></Field></div>
          </div>
        )}
        {kind === "laudo" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ordem de serviço"><Select value={osId} onChange={(e) => setOsId(e.target.value)}>{state.os.length === 0 ? <option>Nenhuma OS</option> : state.os.map((o) => <option key={o.id} value={o.id}>{o.numero} — {o.cliente}</option>)}</Select></Field>
            <Field label="Garantia"><Input value={laudoGar} onChange={(e) => setLaudoGar(e.target.value)} /></Field>
            {state.os.find((o) => o.id === osId) && (
              <div className="sm:col-span-2 rounded-xl border border-line bg-surface p-3 text-sm text-muted">
                Será incluído: equipamento, problema, diagnóstico, solução e peças da OS selecionada.
              </div>
            )}
          </div>
        )}
        {kind === "relatorio" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-surface p-3 text-sm text-muted">
              Relatório automático com KPIs do mês ({brl(M.faturamento(state))} faturado), tabela de OS, principais gastos e análise.
            </div>
            <Field label="Metas / próximos passos (texto livre)"><Textarea rows={2} value={metaMes} onChange={(e) => setMetaMes(e.target.value)} placeholder="Ex.: Aumentar conversão em 10%, reduzir gastos com transporte..." /></Field>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={gerar} disabled={busy}>
            {busy ? "Gerando..." : "📄 Gerar e baixar PDF"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
