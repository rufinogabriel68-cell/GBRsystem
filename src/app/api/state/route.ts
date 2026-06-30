import { NextRequest, NextResponse } from "next/server";
import { getSystemState, saveSystemState, mergeWithDbState } from "@/lib/system-state";
import type { State } from "@/lib/types";

const SYSTEM_USER = {
  id: "default",
  name: "Administrador",
  email: "admin@gbr.os",
};

export async function GET() {
  try {
    const data = await getSystemState();
    return NextResponse.json({ data, user: SYSTEM_USER });
  } catch (e: any) {
    console.error("Erro no GET /api/state:", e);
    return NextResponse.json({ error: "Erro ao carregar estado" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as State;
    const currentDb = await getSystemState();
    const merged = mergeWithDbState(body, currentDb);
    await saveSystemState(merged);
    return NextResponse.json({ ok: true, data: merged, user: SYSTEM_USER });
  } catch (e: any) {
    console.error("Erro no PUT /api/state:", e);
    return NextResponse.json({ error: "Erro ao salvar estado" }, { status: 500 });
  }
}
