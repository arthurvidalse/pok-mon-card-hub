import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logContact, type CardRow, type PokemonRow } from "@/lib/collection.functions";
import { STATUS_META, padDex } from "@/lib/status";
import { buildCardMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export function PokemonDetail({
  pokemon,
  whatsappNumber,
}: {
  pokemon: PokemonRow;
  whatsappNumber: string;
}) {
  const log = useServerFn(logContact);
  const [copied, setCopied] = useState(false);

  function contact(card: CardRow, intent: "oferecer" | "buscar") {
    const message = buildCardMessage({
      pokemonName: pokemon.name,
      dex: pokemon.dex_number,
      collectionName: card.collection?.name,
      cardNumber: card.card_number,
      intent,
    });
    void log({
      data: {
        cardId: card.id,
        pokemonId: pokemon.id,
        label: `${pokemon.name} — ${card.collection?.name ?? "sem coleção"}`,
        intent,
      },
    }).catch(() => {});
    window.open(buildWhatsAppUrl(whatsappNumber, message), "_blank", "noopener");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-start">
        <img
          src={pokemon.sprite_url ?? ""}
          alt={`Arte oficial de ${pokemon.name}`}
          className="size-40 object-contain"
        />
        <div className="flex-1 text-center sm:text-left">
          <span className="font-mono text-sm text-muted-foreground">{padDex(pokemon.dex_number)}</span>
          <h1 className="font-display text-3xl font-bold">{pokemon.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pokemon.generation ? `Geração ${pokemon.generation} · ` : ""}
            {pokemon.cards.length} carta(s) registrada(s)
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={copyLink}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copiar link
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pokemon.cards.map((card) => {
          const meta = STATUS_META[card.status];
          const wants = card.status !== "tenho_full_art";
          return (
            <article key={card.id} className="holo-card rounded-2xl border-2 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    {card.collection?.name ?? "Coleção a definir"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {[card.card_type, card.card_number ? `#${card.card_number}` : null]
                      .filter(Boolean)
                      .join(" · ") || "Versão Full Art"}
                  </p>
                </div>
                <span className={cn("rounded-full border px-2 py-1 text-xs font-medium", meta.chip)}>
                  {meta.short}
                </span>
              </div>

              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={`Carta ${pokemon.name} ${card.collection?.name ?? ""}`}
                  loading="lazy"
                  className="mt-3 w-full rounded-xl object-contain"
                />
              ) : null}

              {card.notes ? <p className="mt-3 text-sm text-muted-foreground">{card.notes}</p> : null}

              <p className="mt-3 text-sm">{meta.label}</p>

              <Button
                className="mt-4 w-full"
                variant={wants ? "default" : "secondary"}
                onClick={() => contact(card, wants ? "oferecer" : "buscar")}
              >
                <MessageCircle className="size-4" />
                {wants ? "Tenho essa carta e quero oferecer" : "Quero negociar essa carta"}
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
