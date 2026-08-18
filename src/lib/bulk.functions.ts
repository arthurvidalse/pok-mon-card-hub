import { createServerFn } from "@tanstack/react-start";
<<<<<<< HEAD

export type BulkSetSummary = {
  setId: string;
  setName: string;
  quantity: number;
};

export const listBulkSets = createServerFn({ method: "GET" }).handler(async (): Promise<BulkSetSummary[]> => {
  const { createPublicClient } = await import("./supabase-public.server");
  const supabase = createPublicClient();
  
  // Aggregate using a simpler approach since Supabase rpc isn't set up for this yet
  const { data, error } = await supabase
    .from("bulk_cards")
    .select("set_id, set_name, quantity")
    .gt("quantity", 0);
    
  if (error) throw new Error(error.message);
  
  const setsMap = new Map<string, BulkSetSummary>();
  
  for (const row of data || []) {
    const existing = setsMap.get(row.set_id);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      setsMap.set(row.set_id, {
        setId: row.set_id,
        setName: row.set_name,
        quantity: row.quantity
      });
    }
  }
  
  return Array.from(setsMap.values());
});

export type BulkCardGalleryItem = {
  id: string;
  setId: string;
  setName: string;
  localId: string;
  cardName: string;
  imageUrl?: string;
  rarity?: string;
  condition: string;
  quantity: number;
  price: number | null;
  notes?: string;
};

export const getBulkSetGallery = createServerFn({ method: "GET" })
  .inputValidator((input: { setId: string }) => input)
  .handler(async ({ data }): Promise<BulkCardGalleryItem[]> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    
    // Fetch all available cards for this set
    const { data: cards, error: cardsError } = await supabase
      .from("bulk_cards")
      .select("*")
      .eq("set_id", data.setId);
      
    if (cardsError) throw new Error(cardsError.message);
    
    // Fetch price rules
    const { data: rules, error: rulesError } = await supabase
      .from("bulk_price_rules")
      .select("*");
      
    if (rulesError) throw new Error(rulesError.message);
    
    const rulesMap = new Map<string, number>();
    for (const rule of rules || []) {
      rulesMap.set(`${rule.rarity}_${rule.condition}`, rule.price);
    }
    
    return (cards || []).map(card => {
      let price = card.price_override;
      
      if (price === null && card.rarity) {
        const rulePrice = rulesMap.get(`${card.rarity}_${card.condition}`);
        if (rulePrice !== undefined) {
          price = rulePrice;
        }
      }
      
      return {
        id: card.id,
        setId: card.set_id,
        setName: card.set_name,
        localId: card.local_id,
        cardName: card.card_name,
        imageUrl: card.image_url || undefined,
        rarity: card.rarity || undefined,
        condition: card.condition,
        quantity: card.quantity,
        price,
        notes: card.notes || undefined
      };
    });
=======
import {
  cardImageUrl,
  fetchSet,
  fetchSets,
  normalizeLocalId,
  setLogoUrl,
  type TcgdexSetBrief,
} from "./tcgdex";

export type BulkPriceRule = {
  id: string;
  rarity: string;
  condition: string;
  price: number;
};

export type BulkCardRow = {
  id: string;
  set_id: string;
  set_name: string | null;
  local_id: string;
  card_name: string | null;
  image_url: string | null;
  rarity: string | null;
  condition: string;
  quantity: number;
  price_override: number | null;
  notes: string | null;
};

export type BulkStockEntry = {
  id: string;
  condition: string;
  quantity: number;
  price: number | null;
  rarity: string | null;
};

export type BulkGalleryCard = {
  localId: string;
  name: string;
  image: string | null;
  rarity: string | null;
  stock: BulkStockEntry[];
};

export type BulkSetSummary = {
  set_id: string;
  set_name: string;
  logo: string | null;
  cards: number;
  units: number;
};

const BULK_SELECT =
  "id,set_id,set_name,local_id,card_name,image_url,rarity,condition,quantity,price_override,notes";

export const listTcgdexSets = createServerFn({ method: "GET" }).handler(
  async (): Promise<TcgdexSetBrief[]> => {
    const sets = await fetchSets();
    return sets.map((s) => ({ id: s.id, name: s.name, cardCount: s.cardCount })).reverse();
  },
);

export const getTcgdexSetCards = createServerFn({ method: "GET" })
  .inputValidator((input: { setId: string }) => input)
  .handler(async ({ data }) => {
    const set = await fetchSet(data.setId);
    return {
      id: set.id,
      name: set.name,
      cards: (set.cards ?? []).map((card) => ({
        localId: card.localId,
        name: card.name,
        image: cardImageUrl(card.image),
      })),
    };
  });

export const listBulkPriceRules = createServerFn({ method: "GET" }).handler(
  async (): Promise<BulkPriceRule[]> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("bulk_price_rules")
      .select("id,rarity,condition,price")
      .order("rarity", { ascending: true });
    return (data ?? []).map((row) => ({ ...row, price: Number(row.price ?? 0) }));
  },
);

export const listBulkSets = createServerFn({ method: "GET" }).handler(
  async (): Promise<BulkSetSummary[]> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("bulk_cards")
      .select("set_id,set_name,quantity")
      .gt("quantity", 0);

    const grouped = new Map<string, BulkSetSummary>();
    for (const row of data ?? []) {
      const current = grouped.get(row.set_id) ?? {
        set_id: row.set_id,
        set_name: row.set_name ?? row.set_id,
        logo: null,
        cards: 0,
        units: 0,
      };
      current.cards += 1;
      current.units += Number(row.quantity ?? 0);
      if (row.set_name) current.set_name = row.set_name;
      grouped.set(row.set_id, current);
    }

    if (grouped.size === 0) return [];

    try {
      const sets = await fetchSets();
      for (const set of sets) {
        const entry = grouped.get(set.id);
        if (entry) {
          entry.logo = setLogoUrl(set.logo);
          entry.set_name = set.name;
        }
      }
    } catch {
      // catálogo indisponível: segue sem logo
    }

    return [...grouped.values()].sort((a, b) => a.set_name.localeCompare(b.set_name));
  },
);

export const getBulkSet = createServerFn({ method: "GET" })
  .inputValidator((input: { setId: string }) => input)
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();

    const [stockResult, rulesResult] = await Promise.all([
      supabase.from("bulk_cards").select(BULK_SELECT).eq("set_id", data.setId),
      supabase.from("bulk_price_rules").select("rarity,condition,price"),
    ]);

    const rules = new Map<string, number>();
    for (const rule of rulesResult.data ?? []) {
      rules.set(`${rule.rarity}__${rule.condition}`, Number(rule.price ?? 0));
    }

    const stockByLocal = new Map<string, BulkStockEntry[]>();
    for (const row of (stockResult.data ?? []) as BulkCardRow[]) {
      if (Number(row.quantity) <= 0) continue;
      const key = normalizeLocalId(row.local_id);
      const priceRule = row.rarity ? rules.get(`${row.rarity}__${row.condition}`) : undefined;
      const price =
        row.price_override !== null && row.price_override !== undefined
          ? Number(row.price_override)
          : priceRule ?? null;
      const list = stockByLocal.get(key) ?? [];
      list.push({
        id: row.id,
        condition: row.condition,
        quantity: Number(row.quantity),
        price,
        rarity: row.rarity,
      });
      stockByLocal.set(key, list);
    }

    let setName = data.setId;
    let logo: string | null = null;
    let cards: BulkGalleryCard[] = [];

    try {
      const set = await fetchSet(data.setId);
      setName = set.name ?? data.setId;
      logo = setLogoUrl(set.logo);
      cards = (set.cards ?? []).map((card) => ({
        localId: card.localId,
        name: card.name,
        image: cardImageUrl(card.image),
        rarity: null,
        stock: stockByLocal.get(normalizeLocalId(card.localId)) ?? [],
      }));
    } catch {
      cards = [];
    }

    if (cards.length === 0) {
      for (const row of (stockResult.data ?? []) as BulkCardRow[]) {
        if (Number(row.quantity) <= 0) continue;
        setName = row.set_name ?? setName;
        cards.push({
          localId: row.local_id,
          name: row.card_name ?? `#${row.local_id}`,
          image: row.image_url,
          rarity: row.rarity,
          stock: stockByLocal.get(normalizeLocalId(row.local_id)) ?? [],
        });
      }
    }

    return { setId: data.setId, setName, logo, cards };
>>>>>>> f5e97af8e5abd158a7357a3bb14eb108e18c294a
  });
