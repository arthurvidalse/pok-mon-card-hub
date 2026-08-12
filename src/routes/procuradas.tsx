import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/site/header";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { getSettings, listWantedPokemons } from "@/lib/collection.functions";
import { buildCardMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { padDex } from "@/lib/status";

export const Route = createFileRoute("/procuradas")({
  head: () => ({
    meta: [
      { title: "Cartas que eu procuro — AV Collectr" },
      {
        name: "description",
        content:
          "Lista dos Pokémon que ainda não tenho de nenhuma forma na coleção — nem a versão comum, nem a Full Art.",
      },
      { property: "og:title", content: "Cartas que eu procuro — AV Collectr" },
      {
        property: "og:description",
        content: "Pokémon que faltam por completo na minha coleção. Tem alguma dessas cartas? Me chama!",
      },
    ],
  }),
  component: WantedPage,
});

function WantedPage() {
  const wanted = useServerFn(listWantedPokemons);
  const settings = useServerFn(getSettings);
  const wantedQuery = useQuery({ queryKey: ["wanted"], queryFn: () => wanted() });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: () => settings() });
  const number = settingsQuery.data?.whatsapp_number ?? "";

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </Button>

        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Cartas que eu procuro</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Esses são os Pokémon que eu ainda não tenho de nenhuma forma na coleção — nem a comum, nem a Full
          Art. Tem alguma dessas cartas? Me chama!
        </p>

        {wantedQuery.isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : (wantedQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-10 text-muted-foreground">Nenhum Pokémon faltando por completo. 🎉</p>
        ) : (
          <>
            <p className="mt-6 text-sm font-medium text-muted-foreground">
              {wantedQuery.data!.length.toLocaleString("pt-BR")} Pokémon na lista de procurados
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {wantedQuery.data!.map((pokemon) => (
                <div
                  key={pokemon.id}
                  className="holo-card group flex flex-col rounded-2xl border-2 border-destructive/60 bg-card p-3 text-center"
                >
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {padDex(pokemon.dex_number)}
                  </span>
                  <Link
                    to="/pokemon/$dex"
                    params={{ dex: String(pokemon.dex_number) }}
                    className="relative mx-auto my-1 flex h-24 w-full items-center justify-center"
                  >
                    <img
                      src={pokemon.sprite_url ?? ""}
                      alt={`Arte oficial de ${pokemon.name}`}
                      loading="lazy"
                      className="max-h-24 object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </Link>
                  <span className="truncate font-display text-sm font-semibold">{pokemon.name}</span>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <a
                      href={buildWhatsAppUrl(
                        number,
                        buildCardMessage({
                          pokemonName: pokemon.name,
                          dex: pokemon.dex_number,
                          intent: "oferecer",
                        }),
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-4" /> Tenho essa
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Coleção Pokémon TCG · AV Collectr
      </footer>
      <WhatsAppFab number={number} />
    </div>
  );
}
