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
