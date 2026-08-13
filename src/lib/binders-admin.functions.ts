import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Binder, BinderCard, BinderCardStatus } from "./binders.functions";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin");
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

const BINDER_SELECT = "id,title,slug,description,rows,cols,is_visible,sort_order";

/** Admin: lista todos os binders (incluindo ocultos) */
export const listAllBinders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Binder[]> => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("binders")
      .select(BINDER_SELECT)
      .order("sort_order", { ascending: true });
    return (data ?? []) as Binder[];
  });

export type BinderInput = {
  id?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  rows: number;
  cols: number;
  is_visible: boolean;
  sort_order: number;
};

/** Admin: cria ou atualiza um binder */
export const saveBinder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BinderInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const payload = {
      title: data.title.trim(),
      slug: data.slug.trim().toLowerCase(),
      description: data.description?.trim() || null,
      rows: Math.max(1, Math.trunc(data.rows)),
      cols: Math.max(1, Math.trunc(data.cols)),
      is_visible: data.is_visible,
      sort_order: Math.trunc(data.sort_order),
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("binders")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("binders").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Admin: remove um binder (cascade apaga as cartas) */
export const deleteBinder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("binders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: lista cartas de um binder (incluindo binders ocultos) */
export const listBinderCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { binderId: string }) => input)
  .handler(async ({ data, context }): Promise<BinderCard[]> => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase
      .from("binder_cards")
      .select("id,binder_id,position,card_name,image_url,set_name,condition,price,status,notes")
      .eq("binder_id", data.binderId)
      .order("position", { ascending: true });
    return (rows ?? []) as BinderCard[];
  });

export type BinderCardInput = {
  id?: string | null;
  binder_id: string;
  position: number;
  card_name?: string | null;
  image_url?: string | null;
  set_name?: string | null;
  condition?: string | null;
  price?: number | null;
  status?: BinderCardStatus;
  notes?: string | null;
};

/** Admin: cria ou atualiza uma carta em um slot */
export const saveBinderCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BinderCardInput) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const payload = {
      binder_id: data.binder_id,
      position: data.position,
      card_name: data.card_name?.trim() || null,
      image_url: data.image_url?.trim() || null,
      set_name: data.set_name?.trim() || null,
      condition: data.condition?.trim() || null,
      price: data.price ?? null,
      status: data.status ?? "available",
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("binder_cards")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      // upsert por (binder_id, position) — garante que um slot só é preenchido 1x
      const { error } = await context.supabase
        .from("binder_cards")
        .upsert(payload, { onConflict: "binder_id,position" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Admin: limpa o conteúdo de um slot (delete da binder_card) */
export const clearBinderCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("binder_cards")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: altera o status de uma carta (available/reserved/sold) */
export const updateBinderCardStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: BinderCardStatus }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("binder_cards")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
