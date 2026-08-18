import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cardImageUrl, fetchCardsBatch, normalizeLocalId } from "./tcgdex";
import type { BulkCardRow, BulkPriceRule } from "./bulk.functions";

export type ImportInputRow = {
  setId: string;
  setName: string;
  localId: string;
  name: string;
  condition: string;
  quantity: number;
  price: number | null;
};

export type ImportPreviewRow = ImportInputRow & {
  imageUrl: string | null;
  rarity: string | null;
  resolvedPrice: number | null;
  missingRule: boolean;
  notFound: boolean;
};

const BULK_SELECT =
  "id,set_id,set_name,local_id,card_name,image_url,rarity,condition,quantity,price_override,notes";

async function assertAdmin(context: { supabase: any }) {
  const { data } = await context.supabase.rpc("is_admin");
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

export const listAllPriceRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BulkPriceRule[]> => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("bulk_price_rules")
      .select("id,rarity,condition,price")
      .order("rarity", { ascending: true });
    return (data ?? []).map((row: any) => ({ ...row, price: Number(row.price ?? 0) }));
  });

export const savePriceRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string | null; rarity: string; condition: string; price: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      rarity: data.rarity.trim(),
      condition: data.condition.trim(),
      price: Number(data.price) || 0,
    };
    const { error } = data.id
      ? await context.supabase.from("bulk_price_rules").update(payload).eq("id", data.id)
      : await context.supabase
          .from("bulk_price_rules")
          .upsert(payload, { onConflict: "rarity,condition" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePriceRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("bulk_price_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllBulkCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string }) => input ?? {})
  .handler(async ({ data, context }): Promise<BulkCardRow[]> => {
    await assertAdmin(context);
    let query = context.supabase
      .from("bulk_cards")
      .select(BULK_SELECT)
      .order("set_id", { ascending: true })
      .order("local_id", { ascending: true })
      .limit(500);
    const term = (data?.search ?? "").trim();
    if (term) query = query.or(`card_name.ilike.%${term}%,set_name.ilike.%${term}%,set_id.ilike.%${term}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as BulkCardRow[];
  });

export const saveBulkCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      quantity?: number;
      condition?: string;
      price_override?: number | null;
      notes?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("bulk_cards").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBulkCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("bulk_cards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: ImportInputRow[] }) => input)
  .handler(async ({ data, context }): Promise<ImportPreviewRow[]> => {
    await assertAdmin(context);

    const rows = data.rows.filter((row) => row.setId && row.localId && Number(row.quantity) > 0).slice(0, 500);
    const { data: ruleRows } = await context.supabase
      .from("bulk_price_rules")
      .select("rarity,condition,price");
    const rules = new Map<string, number>();
    for (const rule of ruleRows ?? []) {
      rules.set(`${rule.rarity}__${rule.condition}`, Number(rule.price ?? 0));
    }

    const bySet = new Map<string, string[]>();
    for (const row of rows) {
      bySet.set(row.setId, [...(bySet.get(row.setId) ?? []), row.localId]);
    }
    const catalogs = new Map<string, Awaited<ReturnType<typeof fetchCardsBatch>>>();
    for (const [setId, localIds] of bySet) {
      try {
        catalogs.set(setId, await fetchCardsBatch(setId, localIds));
      } catch {
        catalogs.set(setId, new Map());
      }
    }

    return rows.map((row) => {
      const card = catalogs.get(row.setId)?.get(normalizeLocalId(row.localId));
      const rarity = card?.rarity ?? null;
      const condition = (row.condition || "NM").trim();
      const ruleKey = rarity ? `${rarity}__${condition}` : "";
      const rulePrice = ruleKey && rules.has(ruleKey) ? rules.get(ruleKey)! : null;
      const resolvedPrice = row.price !== null && row.price !== undefined ? row.price : rulePrice;
      return {
        ...row,
        condition,
        name: card?.name ?? row.name,
        imageUrl: cardImageUrl(card?.image) ?? null,
        rarity,
        resolvedPrice,
        missingRule: row.price === null && rulePrice === null,
        notFound: !card,
      };
    });
  });

export const commitBulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: ImportPreviewRow[] }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = data.rows
      .filter((row) => Number(row.quantity) > 0)
      .map((row) => ({
        set_id: row.setId,
        set_name: row.setName,
        local_id: row.localId,
        card_name: row.name,
        image_url: row.imageUrl,
        rarity: row.rarity,
        condition: row.condition || "NM",
        quantity: Number(row.quantity),
        price_override: row.price !== null && row.price !== undefined ? Number(row.price) : null,
      }));
    if (payload.length === 0) return { ok: true, count: 0 };
    const { error } = await context.supabase
      .from("bulk_cards")
      .upsert(payload, { onConflict: "set_id,local_id,condition" });
    if (error) throw new Error(error.message);
    return { ok: true, count: payload.length };
  });
