import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, appStates } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  setSessionCookie,
  toSafeUser,
} from "@/lib/auth";
import { createSeedState } from "@/lib/seed";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Preencha todos os campos." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter ao menos 6 caracteres." },
      { status: 400 }
    );
  }
  const cleanEmail = String(email).toLowerCase().trim();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, cleanEmail))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Este email já está cadastrado." },
      { status: 409 }
    );
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash,
    })
    .returning({ id: users.id, email: users.email, name: users.name });

  await db.insert(appStates).values({
    userId: user.id,
    data: createSeedState() as unknown as object,
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ user: toSafeUser(user) });
}
