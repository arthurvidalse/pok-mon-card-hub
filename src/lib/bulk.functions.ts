import { createServerFn } from "@tanstack/react-start";

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
        setName: row.set_name ?? row.set_id,
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
        setName: card.set_name ?? card.set_id,
        localId: card.local_id,
        cardName: card.card_name ?? `#${card.local_id}`,
        imageUrl: card.image_url || undefined,
        rarity: card.rarity || undefined,
        condition: card.condition,
        quantity: card.quantity,
        price,
        notes: card.notes || undefined
      };
    });
  });
