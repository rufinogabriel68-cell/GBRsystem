import { fmtDate, brl } from "./utils";
import type { State, Orcamento } from "./types";
import { type jsPDF } from "jspdf";
import type { autoTable } from "jspdf-autotable";

const PURPLE: [number, number, number] = [124, 77, 255];
const MAGENTA: [number, number, number] = [200, 64, 224];
const DARK: [number, number, number] = [20, 16, 42];
const MUT: [number, number, number] = [110, 104, 140];

export async function generateQuotePdf(
  state: State,
  orc: Orcamento,
  customInfo: {
    logoUrl?: string;
    companyName: string;
    companyInfo: string;
    clientName: string;
    clientInfo: string;
    validade: string;
    condicoes: string;
  }
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  // Helper
  const label = (x: number, y: number, k: string, v: string) => {
    doc.setFontSize(8);
    doc.setTextColor(...MUT);
    doc.text(k.toUpperCase(), x, y);
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(v || "—", x, y + 5);
  };

  // Header
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(customInfo.companyName, 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(customInfo.companyInfo, 14, 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ORÇAMENTO", 196, 13, { align: "right" });

  let y = 44;
  doc.setDrawColor(...MAGENTA);
  doc.setLineWidth(0.5);
  doc.setFillColor(244, 240, 255);
  doc.roundedRect(14, y - 6, 182, 20, 2, 2, "FD");
  label(18, y, "Cliente", customInfo.clientName);
  label(110, y, "Data", fmtDate(orc.data));
  label(18, y + 11, "Telefone", orc.tel);
  label(110, y + 11, "Status", orc.status);

  // Table
  autoTable(doc, {
    startY: y + 22,
    head: [["Serviço", "Qtd", "Valor unit.", "Subtotal"]],
    body: (orc.itens.length ? orc.itens : [{ nome: orc.tipo, qtd: 1, valor: orc.valor }]).map((it) => [
      it.nome,
      String(it.qtd),
      brl(it.valor),
      brl(it.valor * it.qtd),
    ]),
    theme: "grid",
    headStyles: { fillColor: PURPLE, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    styles: { cellPadding: 2.5 },
  });

  // @ts-expect-error injected
  let yt = (doc.lastAutoTable?.finalY ?? y + 40) + 8;
  doc.setFillColor(...MAGENTA);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.roundedRect(120, yt, 76, 12, 2, 2, "F");
  doc.text(`TOTAL: ${brl(orc.valor)}`, 158, yt + 8, { align: "center" });

  yt += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  const condLines = doc.splitTextToSize(`Condições: ${customInfo.condicoes}`, 182);
  doc.text(condLines, 14, yt);
  yt += condLines.length * 5 + 2;
  doc.text(`Validade: ${customInfo.validade}`, 14, yt);
  yt += 8;
  doc.text("Assinatura empresa: ______________________", 14, yt + 14);
  doc.text("Assinatura cliente: ______________________", 110, yt + 14);

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUT);
    doc.text(`${customInfo.companyName}`, 14, 290);
    doc.text(`Gerado em ${fmtDate(new Date().toISOString().slice(0, 10))}`, 196, 290, { align: "right" });
  }

  doc.save(`orcamento-${orc.cliente.replace(/\s/g, "-").toLowerCase()}.pdf`);
}
