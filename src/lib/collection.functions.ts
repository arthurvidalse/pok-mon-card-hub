import { createServerFn } from "@tanstack/react-start";

export type CardStatus = "tenho_full_art" | "tenho_comum" | "nao_tenho";

export type CardRow = {
  id: string;
  card_number: string | null;
  card_type: string | null;
  image_url: string | null;
  status: CardStatus;
  is_target: boolean;
  notes: string | null;
  updated_at: string;
  collection: { id: string; name: string; code: string | null; release_year: number | null } | null;
};

export type PokemonRow = {
  id: string;
  dex_number: number;
  name: string;
  sprite_url: string | null;
  generation: number | null;
  cards: CardRow[];
};

export type CollectionStats = {
  totalPokemons: number;
  totalCards: number;
  fullArt: number;
  comum: number;
  naoTenho: number;
  percent: number;
};

const SELECT =
  "id,dex_number,name,sprite_url,generation,cards(id,card_number,card_type,image_url,status,is_target,notes,updated_at,collections(id,name,code,release_year))";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPokemon(row: any): PokemonRow {
  return {
    id: row.id,
    dex_number: row.dex_number,
    name: row.name,
    sprite_url: row.sprite_url,
    generation: row.generation,
    cards: (row.cards ?? []).map((c: any) => ({
      id: c.id,
      card_number: c.card_number,
      card_type: c.card_type,
      image_url: c.image_url,
      status: c.status,
      is_target: c.is_target,
      notes: c.notes,
      updated_at: c.updated_at,
      collection: c.collections
        ? {
            id: c.collections.id,
            name: c.collections.name,
            code: c.collections.code,
            release_year: c.collections.release_year,
          }
        : null,
    })),
  };
}

export const getStats = createServerFn({ method: "GET" }).handler(async (): Promise<CollectionStats> => {
  const { createPublicClient } = await import("./supabase-public.server");
  const supabase = createPublicClient();
  const [pokemons, total, full, comum, nao] = await Promise.all([
    supabase.from("pokemons").select("id", { count: "exact", head: true }),
    supabase.from("cards").select("id", { count: "exact", head: true }),
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("status", "tenho_full_art"),
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("status", "tenho_comum"),
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("status", "nao_tenho"),
  ]);
  const totalCards = total.count ?? 0;
  const fullArt = full.count ?? 0;
  return {
    totalPokemons: pokemons.count ?? 0,
    totalCards,
    fullArt,
    comum: comum.count ?? 0,
    naoTenho: nao.count ?? 0,
    percent: totalCards ? Math.round((fullArt / totalCards) * 1000) / 10 : 0,
  };
});

export const getRecentAchievements = createServerFn({ method: "GET" }).handler(async (): Promise<PokemonRow[]> => {
  const { createPublicClient } = await import("./supabase-public.server");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("pokemons")
    .select(SELECT)
    .eq("cards.status", "tenho_full_art")
    .order("updated_at", { referencedTable: "cards", ascending: false })
    .limit(8);
  return (data ?? []).filter((p: any) => (p.cards ?? []).length > 0).map(mapPokemon).slice(0, 8);
});

export type ListInput = {
  search?: string;
  status?: CardStatus | "todos";
  generation?: number | null;
  collectionId?: string | null;
  page?: number;
  pageSize?: number;
};

export const listPokemons = createServerFn({ method: "GET" })
  .inputValidator((input: ListInput) => input ?? {})
  .handler(async ({ data }): Promise<{ items: PokemonRow[]; total: number }> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const page = Math.max(0, data.page ?? 0);
    const pageSize = Math.min(60, data.pageSize ?? 24);
    const filtered = data.status && data.status !== "todos";
    const select = filtered
      ? SELECT.replace("cards(", "cards!inner(")
      : SELECT;

    let query = supabase.from("pokemons").select(select, { count: "exact" });

    if (filtered) query = query.eq("cards.status", data.status as CardStatus);
    if (data.generation) query = query.eq("generation", data.generation);
    if (data.collectionId) query = query.eq("cards.collection_id", data.collectionId);
    if (data.search?.trim()) {
      const term = data.search.trim();
      const asNumber = Number(term);
      query = Number.isFinite(asNumber) && term !== ""
        ? query.eq("dex_number", asNumber)
        : query.ilike("name", `%${term}%`);
    }

    const { data: rows, count } = await query
      .order("dex_number", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);

    return { items: (rows ?? []).map(mapPokemon), total: count ?? 0 };
  });

export const getPokemonByDex = createServerFn({ method: "GET" })
  .inputValidator((input: { dex: number }) => input)
  .handler(async ({ data }): Promise<PokemonRow | null> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data: row } = await supabase.from("pokemons").select(SELECT).eq("dex_number", data.dex).maybeSingle();
    return row ? mapPokemon(row) : null;
  });

export const listCollections = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./supabase-public.server");
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("collections")
    .select("id,name,code,release_year,language")
    .order("release_year", { ascending: false });
  return data ?? [];
});

export const getSettings = createServerFn({ method: "GET" }).handler(async (): Promise<Record<string, string>> => {
  const { createPublicClient } = await import("./supabase-public.server");
  const supabase = createPublicClient();
  const { data } = await supabase.from("site_settings").select("key,value");
  const out: Record<string, string> = {};
  for (const row of data ?? []) out[row.key] = row.value ?? "";
  return out;
});

export const logContact = createServerFn({ method: "POST" })
  .inputValidator((input: { cardId?: string | null; pokemonId?: string | null; label: string; intent: string }) => ({
    cardId: input.cardId ?? null,
    pokemonId: input.pokemonId ?? null,
    label: String(input.label).slice(0, 200),
    intent: String(input.intent).slice(0, 40),
  }))
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    await supabase.from("contact_messages").insert({
      card_id: data.cardId,
      pokemon_id: data.pokemonId,
      reference_label: data.label,
      intent: data.intent,
    });
    return { ok: true };
  });
