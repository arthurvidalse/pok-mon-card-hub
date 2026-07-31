import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CardStatus, PokemonRow } from "./collection.functions";

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin");
    return { isAdmin: Boolean(data), userId: context.userId };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_admin");
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

export const updateCardStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string; status: CardStatus }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("cards")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.cardId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCardDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      cardId: string;
      name?: string | null;
      card_number?: string | null;
      card_type?: string | null;
      image_url?: string | null;
      notes?: string | null;
      is_target?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { cardId, ...patch } = data;
    const { error } = await context.supabase
      .from("cards")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", cardId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pokemon_id: string; collection_group_id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("cards").insert({
      pokemon_id: data.pokemon_id,
      collection_group_id: data.collection_group_id,
      status: "nao_tenho",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCustomCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { 
    name: string; 
    card_number?: string | null; 
    image_url?: string | null; 
    status: CardStatus; 
    collection_group_id: string 
  }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("cards").insert({
      name: data.name,
      card_number: data.card_number,
      image_url: data.image_url,
      status: data.status,
      collection_group_id: data.collection_group_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cardId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("cards").delete().eq("id", data.cardId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: data.key, value: data.value }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listContactLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("contact_messages")
      .select("id,reference_label,intent,sent_at")
      .order("sent_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export type AdminPokemon = PokemonRow;
