import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/site/header";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { getSettings } from "@/lib/collection.functions";
import { getBinder, type BinderCard, type BinderCardStatus } from "@/lib/binders.functions";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const searchSchema = z.object({
  folha: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/binder/$slug")({
  validateSearch: zodValidator(searchSchema),
  head: ({ params }) => ({
    meta: [
      { title: `Binder ${params.slug} — AV Collectr Pokémon TCG` },
      {
        name: "description",
        content: "Álbum de cartas Pokémon TCG disponíveis para troca e venda.",
      },
    ],
  }),
  component: BinderPage,
});

function BinderPage() {
  const { slug } = Route.useParams();
  const { folha } = Route.useSearch();
  const navigate = useNavigate();
  const getB = useServerFn(getBinder);
  const settings = useServerFn(getSettings);

  const binderQuery = useQuery({
    queryKey: ["binder", slug],
    queryFn: () => getB({ data: { slug } }),
  });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: () => settings() });

  const binder = binderQuery.data;
  const whatsapp = settingsQuery.data?.whatsapp_number ?? "";

  const totalPages = Math.max(1, binder?.pages ?? 1);
  const page = Math.min(Math.max(1, folha), totalPages);

  function goTo(next: number) {
    const clamped = Math.min(Math.max(1, next), totalPages);
    void navigate({ to: "/binder/$slug", params: { slug }, search: { folha: clamped } });
  }

  // setas do teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(page - 1);
      if (e.key === "ArrowRight") goTo(page + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // swipe no celular
  const touchX = useRef<number | null>(null);

  if (binderQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Skeleton className="mb-6 h-10 w-64 rounded-xl" />
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!binder) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Binder não encontrado</h1>
          <p className="mt-2 text-muted-foreground">
            Este binder não existe ou não está publicado.
          </p>
          <Link
            to="/binders"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            <ArrowLeft className="size-4" /> Ver todos os binders
          </Link>
        </main>
      </div>
    );
  }

  const slots = binder.rows * binder.cols;
  const cardsByPosition = new Map<number, BinderCard>(
    (binder.cards ?? []).map((c) => [c.position, c]),
  );

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/binders"
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Binders
            </Link>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{binder.title}</h1>
            {binder.description ? (
              <p className="mt-1 text-muted-foreground">{binder.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Grade {binder.rows} × {binder.cols} · {totalPages} folha(s)
            </p>
          </div>
        </div>

        {/* Álbum */}
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <button
            type="button"
            aria-label="Folha anterior"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
            className="hidden size-10 shrink-0 items-center justify-center rounded-full border bg-card transition hover:bg-secondary disabled:opacity-30 sm:flex"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div
            key={page}
            className="w-full animate-in fade-in slide-in-from-right-4 duration-300"
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchX.current;
              const end = e.changedTouches[0]?.clientX ?? null;
              if (start == null || end == null) return;
              if (Math.abs(end - start) < 50) return;
              goTo(end < start ? page + 1 : page - 1);
            }}
          >
            <div
              className="mx-auto grid gap-3 rounded-2xl border bg-card/40 p-3 shadow-sm"
              style={{
                gridTemplateColumns: `repeat(${binder.cols}, minmax(0, 1fr))`,
                maxWidth: `${binder.cols * 200 + 24}px`,
              }}
            >
              {Array.from({ length: slots }).map((_, i) => {
                const pos = (page - 1) * slots + i;
                const card = cardsByPosition.get(pos);
                return card ? (
                  <FilledSlot key={pos} card={card} whatsapp={whatsapp} binderTitle={binder.title} />
                ) : (
                  <EmptySlot key={pos} />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            aria-label="Próxima folha"
            disabled={page >= totalPages}
            onClick={() => goTo(page + 1)}
            className="hidden size-10 shrink-0 items-center justify-center rounded-full border bg-card transition hover:bg-secondary disabled:opacity-30 sm:flex"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Controles de folha */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className="rounded-xl border px-3 py-1.5 text-sm transition hover:bg-secondary disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Folha {page} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            className="rounded-xl border px-3 py-1.5 text-sm transition hover:bg-secondary disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </main>

      <WhatsAppFab number={whatsapp} />
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="aspect-[2/3] rounded-xl border-2 border-dashed border-border/60 bg-card/30 transition-colors hover:border-border" />
  );
}

const STATUS_LABEL: Record<BinderCardStatus, string> = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido/Trocado",
};

const STATUS_STYLE: Record<BinderCardStatus, string> = {
  available: "bg-success/15 text-success",
  reserved: "bg-warning/20 text-warning-foreground",
  sold: "bg-neutralcard text-neutralcard-foreground",
};

function FilledSlot({
  card,
  whatsapp,
  binderTitle,
}: {
  card: BinderCard;
  whatsapp: string;
  binderTitle: string;
}) {
  const isDimmed = card.status === "sold" || card.status === "reserved";

  function handleWhatsApp() {
    if (!whatsapp) return;
    const msg = `Olá! Vi no seu binder "${binderTitle}" a carta "${card.card_name ?? "sem nome"}"${card.set_name ? ` (${card.set_name})` : ""}${card.price ? ` — R$ ${card.price.toFixed(2)}` : ""}. Ainda está disponível?`;
    window.open(buildWhatsAppUrl(whatsapp, msg), "_blank");
  }

  return (
    <div
      className={`group relative flex aspect-[2/3] flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 ${isDimmed ? "opacity-70" : "hover:-translate-y-1 hover:shadow-md"}`}
    >
      {/* Imagem */}
      {card.image_url ? (
        <img
          src={card.image_url}
          alt={card.card_name ?? "Carta"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary/40 text-xs text-muted-foreground px-2 text-center">
          {card.card_name ?? "Sem imagem"}
        </div>
      )}

      {/* Overlay de info */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-background/95 via-background/70 to-transparent px-2 py-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {card.card_name ? (
          <p className="truncate text-xs font-semibold leading-tight">{card.card_name}</p>
        ) : null}
        {card.set_name ? (
          <p className="truncate text-xs text-muted-foreground">{card.set_name}</p>
        ) : null}
        {card.price != null ? (
          <p className="text-xs font-bold text-primary">R$ {card.price.toFixed(2)}</p>
        ) : null}
        {whatsapp && card.status === "available" ? (
          <button
            type="button"
            onClick={handleWhatsApp}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg bg-success px-2 py-1 text-xs font-medium text-success-foreground transition hover:brightness-110"
          >
            <MessageCircle className="size-3" /> Tenho interesse
          </button>
        ) : null}
      </div>

      {/* Badge de status */}
      <span
        className={`absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none ${STATUS_STYLE[card.status as BinderCardStatus]}`}
      >
        {STATUS_LABEL[card.status as BinderCardStatus]}
      </span>
    </div>
  );
}
