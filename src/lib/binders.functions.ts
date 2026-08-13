import { createServerFn } from "@tanstack/react-start";

export type BinderCardStatus = "available" | "reserved" | "sold";

export type BinderCard = {
  id: string;
  binder_id: string;
  position: number;
  card_name: string | null;
  image_url: string | null;
  set_name: string | null;
  condition: string | null;
  price: number | null;
  status: BinderCardStatus;
  notes: string | null;
};

export type Binder = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  rows: number;
  cols: number;
  is_visible: boolean;
  sort_order: number;
  cards?: BinderCard[];
};

const BINDER_SELECT = "id,title,slug,description,rows,cols,is_visible,sort_order";

/** Lista binders visíveis para o público */
export const listBinders = createServerFn({ method: "GET" }).handler(
  async (): Promise<Binder[]> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("binders")
      .select(BINDER_SELECT)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });
    return (data ?? []) as Binder[];
  },
);

/** Busca um binder por slug, com todas as cartas */
export const getBinder = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<(Binder & { cards: BinderCard[] }) | null> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();

    const { data: row } = await supabase
      .from("binders")
      .select(BINDER_SELECT)
      .eq("slug", data.slug)
      .eq("is_visible", true)
      .maybeSingle();

    if (!row) return null;

    const { data: cards } = await supabase
      .from("binder_cards")
      .select("id,binder_id,position,card_name,image_url,set_name,condition,price,status,notes")
      .eq("binder_id", row.id)
      .order("position", { ascending: true });

    return { ...(row as Binder), cards: (cards ?? []) as BinderCard[] };
  });
