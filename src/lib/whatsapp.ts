export function buildWhatsAppUrl(number: string, message: string) {
  const clean = (number || "").replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message.slice(0, 600))}`;
}

export function buildCardMessage(opts: {
  pokemonName: string;
  dex: number;
  collectionName?: string | null;
  cardNumber?: string | null;
  intent: "oferecer" | "buscar";
}) {
  const card = [opts.collectionName, opts.cardNumber ? `#${opts.cardNumber}` : null].filter(Boolean).join(" ");
  const ref = card ? `${opts.pokemonName} — ${card}` : `${opts.pokemonName} (Dex #${opts.dex})`;
  return opts.intent === "oferecer"
    ? `Olá! Vi no seu site que você está buscando a carta ${ref}. Eu tenho essa carta e quero oferecer.`
    : `Olá! Vi no seu site a carta ${ref}. Eu quero essa carta — podemos negociar uma troca ou venda?`;
}
