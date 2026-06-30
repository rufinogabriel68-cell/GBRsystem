import { db } from "@/db";
import { appStates, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSeedState } from "@/lib/seed";
import type { State } from "@/lib/types";

const DEFAULT_EMAIL = "admin@gbr.os";

export async function getSystemUserId(): Promise<string> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEFAULT_EMAIL))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const [created] = await db
    .insert(users)
    .values({
      name: "Administrador",
      email: DEFAULT_EMAIL,
      passwordHash: "none",
    })
    .returning({ id: users.id });
  return created.id;
}

export async function getSystemState(): Promise<State> {
  const userId = await getSystemUserId();
  const [row] = await db
    .select()
    .from(appStates)
    .where(eq(appStates.userId, userId))
    .limit(1);
  if (!row) {
    const seed = createSeedState();
    await db.insert(appStates).values({
      userId,
      data: seed as unknown as object,
    });
    return seed;
  }
  return row.data as unknown as State;
}

export function mergeWithDbState(incoming: State, currentDb: State): State {
  if (!currentDb || !incoming) return incoming || currentDb;

  // 1. Verificar se existem chamados (OS) no banco que não estão no incoming
  const incomingOsIds = new Set(incoming.os.map((o) => o.id));
  const incomingOsNums = new Set(incoming.os.map((o) => o.numero));

  const missingFromIncoming = currentDb.os.filter(
    (oDb) => !incomingOsIds.has(oDb.id) && !incomingOsNums.has(oDb.numero)
  );

  if (missingFromIncoming.length > 0) {
    incoming.os.unshift(...missingFromIncoming);
  }

  // 2. Para OS existentes em ambos, mesclar mensagens de chat adicionadas por clientes
  for (const osInc of incoming.os) {
    const osDb = currentDb.os.find(
      (o) => o.id === osInc.id || o.numero === osInc.numero
    );
    if (osDb && osDb.mensagens && osDb.mensagens.length > 0) {
      if (!osInc.mensagens) osInc.mensagens = [];
      const incMsgIds = new Set(osInc.mensagens.map((m) => m.id));
      for (const msgDb of osDb.mensagens) {
        if (!incMsgIds.has(msgDb.id)) {
          osInc.mensagens.push(msgDb);
        }
      }
    }
  }

  // 3. Manter contadores sequenciais sempre no maior valor
  if (currentDb.nextOS > incoming.nextOS) {
    incoming.nextOS = currentDb.nextOS;
  }
  if (currentDb.nextCli > incoming.nextCli) {
    incoming.nextCli = currentDb.nextCli;
  }

  return incoming;
}

export async function saveSystemState(state: State): Promise<void> {
  const userId = await getSystemUserId();
  await db
    .insert(appStates)
    .values({
      userId,
      data: state as unknown as object,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appStates.userId,
      set: { data: state as unknown as object, updatedAt: new Date() },
    });
}
