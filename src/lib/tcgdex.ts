export type TCGdexSet = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: {
    total: number;
    official: number;
  };
};

export type TCGdexCard = {
  id: string;
  localId: string;
  name: string;
  image?: string;
  rarity?: string;
};

export type TCGdexSetDetails = TCGdexSet & {
  cards: TCGdexCard[];
};

export async function listSets(): Promise<TCGdexSet[]> {
  const res = await fetch("https://api.tcgdex.net/v2/en/sets");
  if (!res.ok) throw new Error("Failed to fetch sets from TCGdex");
  return res.json();
}

export async function getSet(id: string): Promise<TCGdexSetDetails> {
  const res = await fetch(`https://api.tcgdex.net/v2/en/sets/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch set details for ${id} from TCGdex`);
  return res.json();
}
