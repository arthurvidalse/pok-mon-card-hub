import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CollectionGroup = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  total_expected: number;
  owned_count: number;
  sort_order: number;
  is_published: boolean;
};

const GROUP_SELECT =
  "id,slug,name,description,cover_url,total_expected,owned_count,sort_order,is_published";

export const listCollectionGroups = createServerFn({ method: "GET" }).handler(
  async (): Promise<CollectionGroup[]> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("collection_groups")
      .select(GROUP_SELECT)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    return (data ?? []) as CollectionGroup[];
  },
);

export const listAllCollectionGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CollectionGroup[]> => {
    const { data } = await context.supabase
      .from("collection_groups")
      .select(GROUP_SELECT)
      .order("sort_order", { ascending: true });
    return (data ?? []) as CollectionGroup[];
  });

export const getCollectionGroup = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data }): Promise<CollectionGroup | null> => {
    const { createPublicClient } = await import("./supabase-public.server");
    const supabase = createPublicClient();
    const { data: row } = await supabase
      .from("collection_groups")
      .select(GROUP_SELECT)
      .eq("slug", data.slug)
      .maybeSingle();
    return (row as CollectionGroup) ?? null;
  });

export type CollectionGroupInput = {
  id?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  cover_url?: string | null;
  total_expected: number;
  owned_count: number;
  sort_order: number;
  is_published: boolean;
};

export const saveCollectionGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CollectionGroupInput) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");

    const payload = {
      slug: data.slug.trim().toLowerCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      cover_url: data.cover_url?.trim() || null,
      total_expected: Math.max(0, Math.trunc(data.total_expected)),
      owned_count: Math.max(0, Math.trunc(data.owned_count)),
      sort_order: Math.trunc(data.sort_order),
      is_published: data.is_published,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("collection_groups")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("collection_groups").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCollectionGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");
    const { error } = await context.supabase.from("collection_groups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
