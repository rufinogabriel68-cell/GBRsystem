import { NextResponse } from "next/server";
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

const DEMO_EMAIL = "demo@gbr.app";
const DEMO_PASS = "demo1234";

export async function POST() {
  const passwordHash = await bcrypt.hash(DEMO_PASS, 10);
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEMO_EMAIL))
    .limit(1);

  let user =
    existing[0] ??
    (
      await db
        .insert(users)
        .values({
          name: "Conta Demonstração",
          email: DEMO_EMAIL,
          passwordHash,
        })
        .returning({ id: users.id, email: users.email, name: users.name })
    )[0];

  const hasState = await db
    .select()
    .from(appStates)
    .where(eq(appStates.userId, user.id))
    .limit(1);
  if (hasState.length === 0) {
    await db.insert(appStates).values({
      userId: user.id,
      data: createSeedState() as unknown as object,
    });
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ user: toSafeUser(user) });
}
