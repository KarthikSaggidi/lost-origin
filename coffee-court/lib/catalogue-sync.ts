import { getDb } from "../db";
import * as t from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { lostOriginMenu, cataloguePortions } from "./lost-origin-catalogue";
import { defaultCourts } from "./domain";
export async function ensureLostOriginCatalogue() {
  const db: any = getDb();
  if (
    (
      await db
        .select()
        .from(t.settings)
        .where(eq(t.settings.key, "lost-origin-menu-v1"))
    ).length
  )
    return;
  const existing = await db.select().from(t.products);
  const setting = (
    await db.select().from(t.settings).where(eq(t.settings.key, "business"))
  )[0];
  const now = new Date().toISOString();
  const ops: any[] = [];
  for (const p of lostOriginMenu)
    ops.push(
      db
        .insert(t.products)
        .values(p)
        .onConflictDoUpdate({ target: t.products.id, set: p }),
    );
  const ids = new Set(lostOriginMenu.map((p) => p.id));
  for (const p of existing)
    if (!ids.has(p.id))
      ops.push(
        db.update(t.products).set({ active: 0 }).where(eq(t.products.id, p.id)),
      );
  for (const item of cataloguePortions) {
    ops.push(db.insert(t.inventory).values(item).onConflictDoNothing());
    ops.push(
      db
        .insert(t.stockLedger)
        .values({
          id: "menu-opening-" + item.id,
          item: item.id,
          delta: item.quantity,
          reason: "Provisional opening estimate — confirm physical stock",
          reference: "LO-MENU-IMPORT",
          createdAt: now,
        })
        .onConflictDoNothing(),
    );
  }
  const value = {
    ...setting.value,
    shopName: "Lost Origin",
    tagline: "Coffee House",
    headline: "Find your\nLost Origin.",
    announcement: "COFFEE HOUSE · FRESHLY BREWED · MADE FOR TAKEAWAY",
    courts: defaultCourts,
  };
  ops.push(
    db.update(t.settings).set({ value }).where(eq(t.settings.key, "business")),
  );
  const campaign = (
    await db.select().from(t.documents).where(eq(t.documents.id, "camp-first"))
  )[0];
  if (campaign)
    ops.push(
      db
        .update(t.documents)
        .set({ data: { ...campaign.data, active: false } })
        .where(eq(t.documents.id, campaign.id)),
    );
  ops.push(
    db
      .insert(t.realtimeClock)
      .values({ id: "workspace", version: 1 })
      .onConflictDoUpdate({
        target: t.realtimeClock.id,
        set: { version: sql`${t.realtimeClock.version}+1` },
      }),
  );
  for (let i = 0; i < ops.length; i += 50) await db.batch(ops.slice(i, i + 50));
  await db
    .insert(t.settings)
    .values({
      key: "lost-origin-menu-v1",
      value: { importedAt: now, products: 35, courts: 4 },
    })
    .onConflictDoNothing();
}
