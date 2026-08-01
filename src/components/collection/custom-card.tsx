import type { CustomCardRow } from "@/lib/collection.functions";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

export function CustomCard({ card }: { card: CustomCardRow }) {
  const meta = STATUS_META[card.status];

  return (
    <div
      className={cn(
        "holo-card group flex flex-col rounded-2xl border-2 bg-card p-3 text-center",
        (card.status === "tenho_full_art" || card.status === "nao_existe") && "border-success/60",
        card.status === "tenho_comum" && "border-warning/60",
        card.status === "nao_tenho" && "border-border",
      )}
    >
      <span className="font-mono text-[11px] text-muted-foreground">{card.card_number || "---"}</span>
      <div className="relative mx-auto my-1 flex h-24 w-full items-center justify-center">
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.name || "Carta Extra"}
            loading="lazy"
            className="max-h-24 object-contain transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex size-full items-center justify-center rounded-xl bg-secondary text-xs text-muted-foreground">
            Sem Imagem
          </div>
        )}
      </div>
      <span className="truncate font-display text-sm font-semibold">{card.name || "Sem Nome"}</span>
      <span className={cn("mt-2 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.chip)}>
        {meta.short}
      </span>
    </div>
  );
}
