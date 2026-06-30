import { NextRequest, NextResponse } from "next/server";
import { getSystemState, saveSystemState } from "@/lib/system-state";
import type { OrdemServico } from "@/lib/types";
import { OS_STATUSES } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nome,
      whatsapp,
      email,
      endereco,
      tipoServico,
      equipamento,
      marcaModelo,
      descricao,
      fotos,
      urgente,
      notifyWhatsApp,
      notifyEmail,
    } = body;

    if (!nome || !whatsapp || !endereco || !tipoServico || !descricao) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    const state = await getSystemState();

    const numero = `OS-${String(state.nextOS).padStart(4, "0")}`;
    const hoje = new Date().toISOString().slice(0, 10);
    const tokenAcesso = uid().slice(0, 16);

    let marca = "";
    let modelo = "";
    if (marcaModelo) {
      const parts = String(marcaModelo).trim().split(/\s+/);
      marca = parts[0] || "";
      modelo = parts.slice(1).join(" ");
    }

    const novaOS: OrdemServico = {
      id: uid(),
      numero,
      cliente: String(nome).trim(),
      tel: String(whatsapp).trim(),
      emailCliente: String(email || "").trim(),
      endereco: String(endereco).trim(),
      equipamento: String(equipamento || tipoServico).trim(),
      marca,
      modelo,
      tipo: String(tipoServico),
      prioridade: urgente ? "Urgente" : "Normal",
      problema: String(descricao).trim(),
      diagnostico: "",
      solucao: "",
      pecas: "",
      status: OS_STATUSES[0],
      valor: 0,
      data: hoje,
      prazo: "",
      obs: "Chamado aberto pelo cliente via portal online.",
      origem: "cliente",
      criadaEm: hoje,
      fotos: Array.isArray(fotos) ? fotos.slice(0, 5) : [],
      historico: [
        { data: hoje, texto: "Chamado aberto pelo cliente via portal online." },
      ],
      tokenAcesso,
      notifyWhatsApp: !!notifyWhatsApp,
      notifyEmail: !!notifyEmail || !!email,
      mensagens: [
        {
          id: uid(),
          autor: "sistema",
          nome: "GBR OS",
          texto: `Olá ${nome.split(" ")[0]}! Recebemos seu chamado ${numero}. Em breve entraremos em contato.`,
          data: new Date().toISOString(),
          lida: false,
        },
      ],
      garantiaDias: 90,
    };

    state.os.unshift(novaOS);
    state.nextOS += 1;

    await saveSystemState(state);

    // Disparar notificação (best effort)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osNumero: numero,
          cliente: novaOS.cliente,
          tel: novaOS.tel,
          email: novaOS.emailCliente,
          status: "Aberta",
          notifyWhatsApp: novaOS.notifyWhatsApp,
          notifyEmail: novaOS.notifyEmail,
          isNew: true,
        }),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({
      ok: true,
      os: {
        numero: novaOS.numero,
        id: novaOS.id,
        tokenAcesso: novaOS.tokenAcesso,
        cliente: novaOS.cliente,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro ao criar chamado: " + (e?.message || "") },
      { status: 500 }
    );
  }
}

export async function GET() {
  const state = await getSystemState();
  const publicOs = state.os
    .filter((o) => o.origem === "cliente")
    .slice(0, 20)
    .map((o) => ({
      numero: o.numero,
      cliente: o.cliente,
      status: o.status,
      data: o.data,
    }));
  return NextResponse.json({ os: publicOs });
}
