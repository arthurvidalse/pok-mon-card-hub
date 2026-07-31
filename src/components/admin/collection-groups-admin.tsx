import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  deleteCollectionGroup,
  listAllCollectionGroups,
  saveCollectionGroup,
  type CollectionGroup,
} from "@/lib/collection-groups.functions";

type Draft = Omit<CollectionGroup, "id"> & { id: string | null };

const EMPTY: Draft = {
  id: null,
  slug: "",
  name: "",
  description: "",
  cover_url: "",
  total_expected: 0,
  owned_count: 0,
  sort_order: 99,
  is_published: true,
};

export function CollectionGroupsAdmin({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const listAll = useServerFn(listAllCollectionGroups);
  const save = useServerFn(saveCollectionGroup);
  const remove = useServerFn(deleteCollectionGroup);

  const [draft, setDraft] = useState<Draft | null>(null);

  const groupsQuery = useQuery({
    queryKey: ["admin-collection-groups"],
    queryFn: () => listAll(),
    enabled,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["admin-collection-groups"] });
    await queryClient.invalidateQueries({ queryKey: ["collection-groups"] });
  }

  async function submit() {
    if (!draft) return;
    if (!draft.name.trim() || !draft.slug.trim()) {
      toast.error("Nome e apelido (slug) são obrigatórios.");
      return;
    }
    try {
      await save({ data: { ...draft, id: draft.id ?? undefined } });
      toast.success("Coleção salva!");
      setDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  }

  async function destroy(id: string) {
    try {
      await remove({ data: { id } });
      toast.success("Coleção removida.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="size-4" /> Nova coleção
        </Button>
      </div>

      {draft ? (
        <div className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cg-name">Nome</Label>
            <Input
              id="cg-name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cg-slug">Apelido na URL (slug)</Label>
            <Input
              id="cg-slug"
              value={draft.slug}
              onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
              placeholder="lucario"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cg-total">Total esperado de cartas</Label>
            <Input
              id="cg-total"
              type="number"
              min={0}
              value={draft.total_expected}
              onChange={(event) => setDraft({ ...draft, total_expected: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cg-owned">Cartas que já tenho</Label>
            <Input
              id="cg-owned"
              type="number"
              min={0}
              value={draft.owned_count}
              onChange={(event) => setDraft({ ...draft, owned_count: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cg-cover">URL da capa/ícone</Label>
            <Input
              id="cg-cover"
              value={draft.cover_url ?? ""}
              onChange={(event) => setDraft({ ...draft, cover_url: event.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cg-order">Ordem de exibição</Label>
            <Input
              id="cg-order"
              type="number"
              value={draft.sort_order}
              onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cg-desc">Descrição</Label>
            <Input
              id="cg-desc"
              value={draft.description ?? ""}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Switch
              id="cg-pub"
              checked={draft.is_published}
              onCheckedChange={(checked) => setDraft({ ...draft, is_published: checked })}
            />
            <Label htmlFor="cg-pub">Visível no site</Label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button onClick={submit}>
              <Save className="size-4" /> Salvar
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {groupsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)
          : (groupsQuery.data ?? []).map((group) => (
              <div key={group.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2">
                <div className="min-w-40 flex-1">
                  <p className="font-medium">
                    {group.name}
                    {group.is_published ? null : (
                      <span className="ml-2 text-xs text-muted-foreground">(oculta)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    /{group.slug} · {group.owned_count} de {group.total_expected} cartas
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDraft({ ...group })}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void destroy(group.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
      </div>
    </div>
  );
}
