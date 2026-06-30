import { NextRequest, NextResponse } from "next/server";
import { getSystemState } from "@/lib/system-state";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  const { numero } = await params;
  const token = req.nextUrl.searchParams.get("token") || "";
  const tel = req.nextUrl.searchParams.get("tel") || "";
  const emailParam = req.nextUrl.searchParams.get("email") || "";

  const state = await getSystemState();
  const os = state.os.find(
    (o) => o.numero.toLowerCase() === numero.toLowerCase()
  );

  if (!os) {
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
  }

  const telMatch =
    tel &&
    os.tel.replace(/\D/g, "").endsWith(tel.replace(/\D/g, "").slice(-4));

  const emailMatch =
    emailParam &&
    os.emailCliente?.toLowerCase().trim() === emailParam.toLowerCase().trim();

  const tokenMatch = token && os.tokenAcesso && token === os.tokenAcesso;

  const canAccess =
    tokenMatch ||
    telMatch ||
    emailMatch ||
    (!os.tokenAcesso && os.origem === "cliente");

  if (!canAccess) {
    return NextResponse.json({
      needAuth: true,
      numero: os.numero,
      cliente: os.cliente.substring(0, 2) + "***",
      status: os.status,
    });
  }

  let garantia = null;
  if (os.garantiaDias && os.garantiaInicio) {
    const inicio = new Date(os.garantiaInicio);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + os.garantiaDias);
    const hoje = new Date();
    const diasRest = Math.ceil((fim.getTime() - hoje.getTime()) / 86400000);
    garantia = {
      dias: os.garantiaDias,
      inicio: os.garantiaInicio,
      fim: fim.toISOString().slice(0, 10),
      diasRestantes: diasRest,
      vencida: diasRest < 0,
      proxima: diasRest >= 0 && diasRest <= 7,
    };
  } else if (os.status === "Entregue" || os.status === "Concluída") {
    const hist = os.historico.find((h) => h.texto.toLowerCase().includes("conclu"));
    const inicioStr = hist?.data || os.data;
    const inicio = new Date(inicioStr);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 90);
    const hoje = new Date();
    const diasRest = Math.ceil((fim.getTime() - hoje.getTime()) / 86400000);
    garantia = {
      dias: 90,
      inicio: inicioStr,
      fim: fim.toISOString().slice(0, 10),
      diasRestantes: diasRest,
      vencida: diasRest < 0,
      proxima: diasRest >= 0 && diasRest <= 7,
    };
  }

  return NextResponse.json({
    os: {
      numero: os.numero,
      cliente: os.cliente,
      equipamento: os.equipamento,
      marca: os.marca,
      modelo: os.modelo,
      tipo: os.tipo,
      problema: os.problema,
      diagnostico: os.diagnostico,
      solucao: os.solucao,
      status: os.status,
      prioridade: os.prioridade,
      data: os.data,
      prazo: os.prazo,
      valor: os.valor,
      fotos: os.fotos || [],
      historico: os.historico,
      origem: os.origem,
      tokenAcesso: os.tokenAcesso,
      notifyWhatsApp: os.notifyWhatsApp,
      notifyEmail: os.notifyEmail,
    },
    mensagens: os.mensagens || [],
    garantia,
  });
}
