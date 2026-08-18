const BASE = "https://api.tcgdex.net/v2/en";

export type TcgdexSetBrief = {
  id: string;
  name: string;
  logo?: string | null;
  symbol?: string | null;
  cardCount?: { total?: number; official?: number };
};

export type TcgdexCardBrief = {
  id: string;
  localId: string;
  name: string;
  image?: string | null;
};

export type TcgdexCardFull = TcgdexCardBrief & {
  rarity?: string | null;
};

export type TcgdexSetFull = TcgdexSetBrief & {
  cards: TcgdexCardBrief[];
};

export function cardImageUrl(image?: string | null, quality: "low" | "high" = "high") {
  if (!image) return null;
  return `${image}/${quality}.webp`;
}

export function setLogoUrl(logo?: string | null) {
  if (!logo) return null;
  return `${logo}.webp`;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`TCGdex ${path} falhou (${res.status})`);
  return (await res.json()) as T;
}

export async function fetchSets(): Promise<TcgdexSetBrief[]> {
  const sets = await getJson<TcgdexSetBrief[]>("/sets");
  return sets.filter((s) => s?.id && s?.name);
}

export async function fetchSet(setId: string): Promise<TcgdexSetFull> {
  return getJson<TcgdexSetFull>(`/sets/${encodeURIComponent(setId)}`);
}

export async function fetchCard(setId: string, localId: string): Promise<TcgdexCardFull | null> {
  try {
    return await getJson<TcgdexCardFull>(
      `/sets/${encodeURIComponent(setId)}/${encodeURIComponent(localId)}`,
    );
  } catch {
    return null;
  }
}

export function normalizeLocalId(value: string) {
  return String(value ?? "").trim().replace(/^0+(?=\d)/, "");
}

export async function fetchCardsBatch(
  setId: string,
  localIds: string[],
  concurrency = 8,
): Promise<Map<string, TcgdexCardFull>> {
  const out = new Map<string, TcgdexCardFull>();
  const queue = [...new Set(localIds)];
  async function worker() {
    while (queue.length > 0) {
      const localId = queue.shift();
      if (!localId) return;
      const card = await fetchCard(setId, localId);
      if (card) out.set(normalizeLocalId(localId), card);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return out;
}

// Backwards-compatible aliases and types expected by older code
export const getSet = fetchSet;
export const listSets = fetchSets;
export type TCGdexSet = TcgdexSetBrief;
export type TCGdexCard = TcgdexCardBrief;
export type TCGdexSetDetails = TcgdexSetFull;
}
