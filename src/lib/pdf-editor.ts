import { fmtDate, brl } from "./utils";
import type { State, Orcamento } from "./types";

const PURPLE: [number, number, number] = [124, 77, 255];
const MAGENTA: [number, number, number] = [200, 64, 224];
const DARK: [number, number, number] = [20, 16, 42];
const MUT: [number, number, number] = [110, 104, 140];

export interface QuotePdfConfig {
  logoUrl?: string;
  companyName: string;
  companyInfo: string;
  clientName: string;
  clientInfo: string;
  clientTel: string;
  validade: string;
  condicoes: string;
  corPrimaria: string;
  corSecundaria: string;
  mostrarAssinaturas: boolean;
  mostrarLogo: boolean;
  observacoes: string;
}

export function defaultQuoteConfig(state: State, orc: Orcamento): QuotePdfConfig {
  return {
    companyName: state.cfg.empresa,
    companyInfo: `${state.cfg.sub}\n${state.cfg.cnpj} • ${state.cfg.tel} • ${state.cfg.cidade}`,
    clientName: orc.cliente,
    clientInfo: orc.end,
    clientTel: orc.tel,
    validade: "15 dias",
    condicoes: "50% na aprovação e 50% na entrega. Aceito PIX e cartão.",
    corPrimaria: "#7c4dff",
    corSecundaria: "#c840e0",
    mostrarAssinaturas: true,
    mostrarLogo: false,
    observacoes: orc.obs || "",
  };
}

export async function generateQuotePdf(
  state: State,
  orc: Orcamento,
  cfg: QuotePdfConfig
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  const primary = hexToRgb(cfg.corPrimaria) || PURPLE;
  const secondary = hexToRgb(cfg.corSecundaria) || MAGENTA;

  const label = (x: number, y: number, k: string, v: string) => {
    doc.setFontSize(8);
    doc.setTextColor(...MUT);
    doc.text(k.toUpperCase(), x, y);
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(v || "—", x, y + 5);
  };

  // Header
  doc.setFillColor(...primary);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(cfg.companyName.split("\n")[0], 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(cfg.companyInfo.replace(/\n/g, "  "), 14, 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ORÇAMENTO", 196, 13, { align: "right" });

  // Logo
  if (cfg.mostrarLogo && cfg.logoUrl) {
    try {
      const img = await loadImage(cfg.logoUrl);
      const aspect = img.width / img.height;
      const w = 22;
      const h = w / aspect;
      doc.addImage(cfg.logoUrl, "JPEG", 170, 4, w, h, undefined, "FAST");
    } catch {}
  }

  let y = 44;
  doc.setDrawColor(...secondary);
  doc.setLineWidth(0.5);
  doc.setFillColor(244, 240, 255);
  doc.roundedRect(14, y - 6, 182, 26, 2, 2, "FD");

  // Client box
  doc.setFontSize(8);
  doc.setTextColor(...MUT);
  doc.text("CLIENTE", 18, y);
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(cfg.clientName || "—", 18, y + 5);
  doc.setFontSize(8);
  doc.setTextColor(...MUT);
  doc.text(cfg.clientInfo || "", 18, y + 11);
  doc.text(cfg.clientTel || "", 18, y + 16);

  // Date/status box
  label(110, y, "Data", fmtDate(orc.data));
  label(110, y + 11, "Status", orc.status);

  y += 26;

  // Services table
  autoTable(doc, {
    startY: y,
    head: [["Serviço", "Qtd", "Valor unit.", "Subtotal"]],
    body: (orc.itens.length ? orc.itens : [{ nome: orc.tipo, qtd: 1, valor: orc.valor }]).map((it) => [
      it.nome,
      String(it.qtd),
      brl(it.valor),
      brl(it.valor * it.qtd),
    ]),
    theme: "grid",
    headStyles: { fillColor: primary, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: DARK },
    styles: { cellPadding: 2.5 },
  });

  // @ts-expect-error injected
  let yt = (doc.lastAutoTable?.finalY ?? y + 40) + 8;
  doc.setFillColor(...secondary);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.roundedRect(120, yt, 76, 12, 2, 2, "F");
  doc.text(`TOTAL: ${brl(orc.valor)}`, 158, yt + 8, { align: "center" });

  yt += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);

  const condLines = doc.splitTextToSize(`Condições: ${cfg.condicoes}`, 182);
  doc.text(condLines, 14, yt);
  yt += condLines.length * 5 + 2;

  doc.text(`Validade: ${cfg.validade}`, 14, yt);
  yt += 8;

  if (cfg.observacoes) {
    const obsLines = doc.splitTextToSize(`Observações: ${cfg.observacoes}`, 182);
    doc.text(obsLines, 14, yt);
    yt += obsLines.length * 5 + 4;
  }

  if (cfg.mostrarAssinaturas) {
    doc.setLineWidth(0.3);
    doc.setDrawColor(...MUT);
    doc.line(14, yt + 14, 90, yt + 14);
    doc.line(116, yt + 14, 196, yt + 14);
    doc.setFontSize(8);
    doc.setTextColor(...MUT);
    doc.text("Assinatura empresa", 52, yt + 19, { align: "center" });
    doc.text("Assinatura cliente", 156, yt + 19, { align: "center" });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUT);
    doc.text(`${cfg.companyName.split("\n")[0]}`, 14, 290);
    doc.text(`Gerado em ${fmtDate(new Date().toISOString().slice(0, 10))}`, 196, 290, { align: "right" });
  }

  doc.save(`orcamento-${orc.cliente.replace(/\s/g, "-").toLowerCase()}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^(..?)(..?)(..?)$/);
  if (!m) return null;
  const r = parseInt(m[1].padEnd(2, m[1]), 16);
  const g = parseInt(m[2].padEnd(2, m[2]), 16);
  const b = parseInt(m[3].padEnd(2, m[3]), 16);
  if ([r, g, b].some((n) => isNaN(n))) return null;
  return [r, g, b];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
