import { NextRequest, NextResponse } from "next/server";
import { getSystemState, saveSystemState } from "@/lib/system-state";
import type { OsMensagem } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ numero: string }> }
) {
  const { numero } = await params;
  const { texto, nome, autor, token } = await req.json();

  if (!texto || String(texto).trim().length < 2) {
    return NextResponse.json(
      { error: "Mensagem muito curta." },
      { status: 400 }
    );
  }

  const state = await getSystemState();
  const idx = state.os.findIndex(
    (o) => o.numero.toLowerCase() === numero.toLowerCase()
  );

  if (idx === -1)
    return NextResponse.json({ error: "OS não encontrada" }, { status: 404 });

  const os = state.os[idx];

  const isTecnico = autor === "tecnico" || token === "tecnico";

  const msg: OsMensagem = {
    id: uid(),
    autor: isTecnico ? "tecnico" : "cliente",
    nome: isTecnico ? "Equipe GBR" : String(nome || os.cliente).slice(0, 40),
    texto: String(texto).slice(0, 1200),
    data: new Date().toISOString(),
    lida: isTecnico,
  };

  if (!os.mensagens) os.mensagens = [];
  os.mensagens.push(msg);

  if (isTecnico) {
    os.historico.push({
      data: new Date().toISOString().slice(0, 10),
      texto: "Mensagem enviada ao cliente.",
    });
  }

  await saveSystemState(state);

  return NextResponse.json({ ok: true, mensagem: msg });
}
