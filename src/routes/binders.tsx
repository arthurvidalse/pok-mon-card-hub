import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/site/header";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { getSettings, } from "@/lib/collection.functions";
import { listBinders, type Binder } from "@/lib/binders.functions";

export const Route = createFileRoute("/binders")({
  head: () => ({
    meta: [
      { title: "Binders — AV Collectr Pokémon TCG" },
      {
        name: "description",
        content:
          "Veja os binders de cartas Pokémon TCG disponíveis para troca, venda ou procura.",
      },
      { property: "og:title", content: "Binders — AV Collectr Pokémon TCG" },
      {
        property: "og:description",
        content: "Binders de cartas Pokémon TCG para troca e venda.",
      },
    ],
  }),
  component: BindersPage,
});

function BindersPage() {
  const list = useServerFn(listBinders);
  const settings = useServerFn(getSettings);

  const bindersQuery = useQuery({ queryKey: ["binders"], queryFn: () => list() });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: () => settings() });

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Binders</h1>
        <p className="mt-1 text-muted-foreground">
          Álbuns de cartas disponíveis para troca, venda ou procura.
        </p>

        {bindersQuery.isLoading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : (bindersQuery.data ?? []).length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center text-muted-foreground">
            <BookOpen className="size-12 opacity-30" />
            <p className="text-sm">Nenhum binder publicado ainda.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(bindersQuery.data ?? []).map((binder) => (
              <BinderCard key={binder.id} binder={binder} />
            ))}
          </div>
        )}
      </main>

      <WhatsAppFab number={settingsQuery.data?.whatsapp_number ?? ""} />
    </div>
  );
}

function BinderCard({ binder }: { binder: Binder }) {
  const totalSlots = binder.rows * binder.cols;

  return (
    <Link
      to="/binder/$slug"
      params={{ slug: binder.slug }}
      className="group flex flex-col rounded-2xl border bg-card p-5 text-left transition-all duration-200 hover:border-primary hover:shadow-lg"
    >
      {/* Miniatura da grade */}
      <div
        className="mb-4 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${Math.min(binder.cols, 4)}, 1fr)` }}
      >
        {Array.from({ length: Math.min(totalSlots, 8) }).map((_, i) => (
          <div
            key={i}
            className="aspect-[2/3] rounded-sm border border-dashed border-border/50 bg-secondary/40 transition-colors group-hover:border-primary/30"
          />
        ))}
      </div>

      {/* Info */}
      <div className="mt-auto">
        <h2 className="font-display text-xl font-bold leading-tight group-hover:text-primary transition-colors">
          {binder.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Grade {binder.rows} × {binder.cols} · {totalSlots} slots
        </p>
        {binder.description ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{binder.description}</p>
        ) : null}
      </div>
    </Link>
  );
}
