import { Link } from "@tanstack/react-router";
import type { PokemonRow } from "@/lib/collection.functions";
import { STATUS_META, padDex } from "@/lib/status";
import { cn } from "@/lib/utils";

function bestStatus(pokemon: PokemonRow) {
  if (pokemon.cards.some((c) => c.status === "tenho_full_art")) return "tenho_full_art" as const;
  if (pokemon.cards.some((c) => c.status === "tenho_comum")) return "tenho_comum" as const;
  return "nao_tenho" as const;
}

export function PokemonCard({ pokemon, compact = false }: { pokemon: PokemonRow; compact?: boolean }) {
  const status = bestStatus(pokemon);
  const meta = STATUS_META[status];

  if (compact) {
    return (
      <Link
        to="/pokemon/$dex"
        params={{ dex: String(pokemon.dex_number) }}
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 transition-colors hover:bg-secondary"
      >
        <span className={cn("size-2.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
        <img
          src={pokemon.sprite_url ?? ""}
          alt={pokemon.name}
          loading="lazy"
          className="size-9 object-contain"
        />
        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{padDex(pokemon.dex_number)}</span>
        <span className="truncate font-medium">{pokemon.name}</span>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{meta.short}</span>
      </Link>
    );
  }

  return (
    <Link
      to="/pokemon/$dex"
      params={{ dex: String(pokemon.dex_number) }}
      className={cn(
        "holo-card group flex flex-col rounded-2xl border-2 bg-card p-3 text-center",
        status === "tenho_full_art" && "border-success/60",
        status === "tenho_comum" && "border-warning/60",
        status === "nao_tenho" && "border-border",
      )}
    >
      <span className="font-mono text-[11px] text-muted-foreground">{padDex(pokemon.dex_number)}</span>
      <div className="relative mx-auto my-1 flex h-24 w-full items-center justify-center">
        <img
          src={pokemon.sprite_url ?? ""}
          alt={`Arte oficial de ${pokemon.name}`}
          loading="lazy"
          className="max-h-24 object-contain transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <span className="truncate font-display text-sm font-semibold">{pokemon.name}</span>
      <span className={cn("mt-2 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.chip)}>
        {meta.short}
      </span>
    </Link>
  );
}
