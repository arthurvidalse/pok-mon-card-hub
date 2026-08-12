import { createServerFn } from "@tanstack/react-start";

export type CardStatus = "tenho_full_art" | "tenho_comum" | "nao_tenho" | "nao_existe";

export type CardRow = {
  id: string;
  name?: string | null;
  card_number: string | null;
  card_type: string | null;
  image_url: string | null;
  status: CardStatus;
  is_target: boolean;
  notes: string | null;
  updated_at: string;
  collection: { id: string; name: string; code: string | null; release_year: number | null } | null;
};

export type CustomCardRow = {
  id: string;
  name: string | null;
  card_number: string | null;
  image_url: string | null;
  status: CardStatus;
  collection_group_id: string | null;
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
    supabase.from("cards").select("id", { count: "exact", head: true }).in("status", ["tenho_full_art", "nao_existe"]),
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
  
  // Buscar as cartas mais recentes que não sejam "nao_tenho"
  const { data: recentCards } = await supabase
    .from("cards")
    .select("pokemon_id")
    .neq("status", "nao_tenho")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (!recentCards || recentCards.length === 0) return [];

  // Deduplicar e pegar no máximo os últimos 8 pokémons distintos
  const pokemonIds = Array.from(
    new Set(recentCards.map((c) => c.pokemon_id).filter((id): id is string => Boolean(id))),
  ).slice(0, 8);

  if (pokemonIds.length === 0) return [];

  // Buscar os dados completos desses pokémons
  const { data: pokemons } = await supabase
    .from("pokemons")
    .select(SELECT)
    .in("id", pokemonIds);

  // Ordenar os pokémons retornados na mesma ordem em que apareceram em recentCards
  return (pokemons ?? [])
    .filter((p: any) => (p.cards ?? []).length > 0)
    .map(mapPokemon)
    .sort((a, b) => pokemonIds.indexOf(a.id) - pokemonIds.indexOf(b.id));
});

export type ListInput = {
  search?: string;
  status?: CardStatus | "todos";
  generation?: number | null;
  collectionId?: string | null;
  groupId?: string | null;
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
    const statusFiltered = data.status && data.status !== "todos";
    const filtered = statusFiltered || Boolean(data.groupId) || Boolean(data.collectionId);
    const select = filtered
      ? SELECT.replace("cards(", "cards!inner(")
      : SELECT;

    let query = supabase.from("pokemons").select(select, { count: "exact" });

    if (statusFiltered) query = query.eq("cards.status", data.status as CardStatus);
    if (data.generation) query = query.eq("generation", data.generation);
    if (data.collectionId) query = query.eq("cards.collection_id", data.collectionId);
    if (data.groupId) query = query.eq("cards.collection_group_id", data.groupId);

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

export const listCustomCards = createServerFn({ method: "GET" })
  .inputValidator((input: { groupId: string; search?: string; status?: CardStatus | "todos" }) => input)
  .handler(async ({ data }): Promise<CustomCardRow[]> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    
    let query = supabase
      .from("cards")
      .select("id, name, card_number, image_url, status, collection_group_id")
      .is("pokemon_id", null)
      .eq("collection_group_id", data.groupId);
      
    if (data.status && data.status !== "todos") {
      query = query.eq("status", data.status);
    }
    if (data.search?.trim()) {
      const term = data.search.trim();
      query = query.ilike("name", `%${term}%`);
    }
    
    const { data: rows } = await query.order("card_number", { ascending: true });
    return (rows ?? []) as unknown as CustomCardRow[];
  });

export type WantedPokemon = {
  id: string;
  dex_number: number;
  name: string;
  sprite_url: string | null;
};

/** Pokémon sem nenhuma versão na coleção: todas as cartas com status "nao_tenho". */
export const listWantedPokemons = createServerFn({ method: "GET" }).handler(
  async (): Promise<WantedPokemon[]> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();

    const owned = new Set<string>();
    const CHUNK = 1000;
    for (let from = 0; ; from += CHUNK) {
      const { data } = await supabase
        .from("cards")
        .select("pokemon_id,status")
        .neq("status", "nao_tenho")
        .not("pokemon_id", "is", null)
        .range(from, from + CHUNK - 1);
      for (const row of data ?? []) if (row.pokemon_id) owned.add(row.pokemon_id);
      if (!data || data.length < CHUNK) break;
    }

    const all: WantedPokemon[] = [];
    for (let from = 0; ; from += CHUNK) {
      const { data } = await supabase
        .from("pokemons")
        .select("id,dex_number,name,sprite_url")
        .order("dex_number", { ascending: true })
        .range(from, from + CHUNK - 1);
      for (const row of data ?? []) if (!owned.has(row.id)) all.push(row as WantedPokemon);
      if (!data || data.length < CHUNK) break;
    }

    return all;
  },
);
