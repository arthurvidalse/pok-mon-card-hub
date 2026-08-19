import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin");
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

// --- Price Rules ---

export const listPriceRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("bulk_price_rules")
      .select("*")
      .order("rarity")
      .order("condition");
    if (error) throw new Error(error.message);
    return data || [];
  });

export const upsertPriceRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rarity: string; condition: string; price: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("bulk_price_rules")
      .upsert(
        { rarity: data.rarity, condition: data.condition, price: data.price },
        { onConflict: "rarity,condition" }
      );
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

// --- Bulk Cards Management ---

export const listBulkCardsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; page?: number; pageSize?: number }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const page = Math.max(0, data.page ?? 0);
    const pageSize = Math.min(100, data.pageSize ?? 50);

    let query = context.supabase.from("bulk_cards").select("*", { count: "exact" });

    if (data.search?.trim()) {
      const term = data.search.trim();
      query = query.or(`card_name.ilike.%${term}%,set_name.ilike.%${term}%`);
    }

    const { data: rows, count, error } = await query
      .order("set_id")
      .order("local_id")
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (error) throw new Error(error.message);
    return { items: rows || [], total: count ?? 0 };
  });

export const updateBulkCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; quantity?: number; condition?: string; price_override?: number | null }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...updates } = data;
    const { error } = await context.supabase.from("bulk_cards").update(updates).eq("id", id);
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

// --- Import ---

export const importBulkCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { rows: any[] }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    
    // Process in batches if necessary, but for simplicity assuming manageable arrays
    const toUpsert = data.rows.map(r => ({
      set_id: r.set_id,
      set_name: r.set_name,
      local_id: r.local_id,
      card_name: r.card_name,
      image_url: r.image_url,
      rarity: r.rarity,
      condition: r.condition,
      quantity: r.quantity,
      price_override: r.price_override
    }));

    const { error } = await context.supabase
      .from("bulk_cards")
      .upsert(toUpsert, { onConflict: "set_id,local_id,condition" });
      
    if (error) throw new Error(error.message);
    return { ok: true, count: toUpsert.length };
  });
