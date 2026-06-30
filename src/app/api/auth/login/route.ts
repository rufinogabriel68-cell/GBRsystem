import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  setSessionCookie,
  toSafeUser,
} from "@/lib/auth";
import { createSeedState } from "@/lib/seed";
import { appStates } from "@/db/schema";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Informe email e senha." },
      { status: 400 }
    );
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, String(email).toLowerCase().trim()))
    .limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Email ou senha incorretos." },
      { status: 401 }
    );
  }
  // Ensure state exists
  const existing = await db
    .select()
    .from(appStates)
    .where(eq(appStates.userId, user.id))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(appStates).values({
      userId: user.id,
      data: createSeedState() as unknown as object,
    });
  }
  const token = await createSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ user: toSafeUser(user) });
}
