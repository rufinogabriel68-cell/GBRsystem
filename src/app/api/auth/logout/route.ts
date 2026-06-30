import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getUser } from "@/lib/auth";

export async function POST() {
  const user = await getUser();
  if (user) {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, token));
    }
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
