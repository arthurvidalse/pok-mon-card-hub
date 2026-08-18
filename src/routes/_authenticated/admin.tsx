import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, LogOut, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/site/header";
import { CollectionGroupsAdmin } from "@/components/admin/collection-groups-admin";
import { BulkAdmin } from "@/components/admin/bulk-admin";

import { getSettings, getStats, listPokemons, listCustomCards, type CardStatus, type CustomCardRow } from "@/lib/collection.functions";
import { amIAdmin, listContactLog, updateCardStatus, updateSetting, createCard, createCustomCard, deleteCard } from "@/lib/admin.functions";
import { listAllCollectionGroups } from "@/lib/collection-groups.functions";
import { STATUS_OPTIONS, padDex } from "@/lib/status";
import {
  listAllBinders,
  saveBinder,
  deleteBinder,
  listBinderCards,
  saveBinderCard,
  clearBinderCard,
  updateBinderCardStatus,
  type BinderInput,
} from "@/lib/binders-admin.functions";
import type { Binder, BinderCard, BinderCardStatus } from "@/lib/binders.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do administrador — AV Collectr" },
      { name: "description", content: "Gerencie o status das cartas Full Art da coleção Pokémon TCG." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel do administrador — AV Collectr" },
      { property: "og:description", content: "Gerencie o status das cartas da coleção." },
    ],
  }),
  component: AdminPage,
});

const PAGE_SIZE = 40;

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listPokemons);
  const stats = useServerFn(getStats);
  const settings = useServerFn(getSettings);
  const saveStatus = useServerFn(updateCardStatus);
  const saveSetting = useServerFn(updateSetting);
  const contacts = useServerFn(listContactLog);
  const addCard = useServerFn(createCard);
  const listGroups = useServerFn(listAllCollectionGroups);

  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<CardStatus | "todos">("todos");
  const [page, setPage] = useState(0);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const adminQuery = useQuery({ queryKey: ["am-i-admin"], queryFn: () => checkAdmin() });
  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: () => stats() });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: () => settings() });
  const contactsQuery = useQuery({
    queryKey: ["contact-log"],
    queryFn: () => contacts(),
    enabled: adminQuery.data?.isAdmin === true,
  });
  const groupsQuery = useQuery({
    queryKey: ["admin-collection-groups"],
    queryFn: () => listGroups(),
    enabled: adminQuery.data?.isAdmin === true,
  });
  const pokemonsQuery = useQuery({
    queryKey: ["admin-pokemons", term, status, page],
    queryFn: () => list({ data: { search: term, status, page, pageSize: PAGE_SIZE } }),
    placeholderData: keepPreviousData,
    enabled: adminQuery.data?.isAdmin === true,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  async function changeStatus(cardId: string, next: CardStatus) {
    try {
      await saveStatus({ data: { cardId, status: next } });
      toast.success("Status atualizado!");
      await queryClient.invalidateQueries({ queryKey: ["admin-pokemons"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      await queryClient.invalidateQueries({ queryKey: ["pokemons"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar.");
    }
  }

  async function saveWhatsapp() {
    try {
      await saveSetting({ data: { key: "whatsapp_number", value: whatsapp ?? "" } });
      toast.success("Número salvo!");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    }
  }

  async function handleCreateCard(pokemonId: string) {
    if (!selectedGroup) {
      toast.error("Selecione uma coleção primeiro para adicionar a carta.");
      return;
    }
    try {
      await addCard({ data: { pokemon_id: pokemonId, collection_group_id: selectedGroup } });
      toast.success("Carta adicionada com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["admin-pokemons"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
      await queryClient.invalidateQueries({ queryKey: ["pokemons"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar carta.");
    }
  }

  if (adminQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!adminQuery.data?.isAdmin) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">Esta conta não tem permissão de administrador.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={signOut}>
              Sair
            </Button>
            <Button asChild>
              <Link to="/">Voltar ao site</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const total = pokemonsQuery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const whatsappValue = whatsapp ?? settingsQuery.data?.whatsapp_number ?? "";

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Painel</h1>
            <p className="text-sm text-muted-foreground">
              {statsQuery.data
                ? `${statsQuery.data.fullArt} Full Arts · ${statsQuery.data.comum} comuns · ${statsQuery.data.naoTenho} faltando`
                : "Carregando estatísticas..."}
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>

        <Tabs defaultValue="cartas" className="mt-6">
          <TabsList>
            <TabsTrigger value="cartas">Cartas (Pokédex)</TabsTrigger>
            <TabsTrigger value="extras">Cartas Extras</TabsTrigger>
            <TabsTrigger value="colecoes">Coleções</TabsTrigger>
<<<<<<< HEAD
            <TabsTrigger value="bulk">Bulk</TabsTrigger>
=======
            <TabsTrigger value="binders">Binders</TabsTrigger>
>>>>>>> f5e97af8e5abd158a7357a3bb14eb108e18c294a
            <TabsTrigger value="contatos">Contatos</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="extras" className="mt-4">
            <CustomCardsAdmin
              enabled={adminQuery.data?.isAdmin === true}
              groups={groupsQuery.data ?? []}
            />
          </TabsContent>

          <TabsContent value="colecoes" className="mt-4">
            <CollectionGroupsAdmin enabled={adminQuery.data?.isAdmin === true} />
          </TabsContent>

<<<<<<< HEAD
          <TabsContent value="bulk" className="mt-4">
            <BulkAdmin enabled={adminQuery.data?.isAdmin === true} />
          </TabsContent>

=======
          <TabsContent value="binders" className="mt-4">
            <BindersAdmin enabled={adminQuery.data?.isAdmin === true} />
          </TabsContent>
>>>>>>> f5e97af8e5abd158a7357a3bb14eb108e18c294a

          <TabsContent value="cartas" className="mt-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar Pokémon por nome ou Dex"
                  value={term}
                  onChange={(event) => {
                    setTerm(event.target.value);
                    setPage(0);
                  }}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as CardStatus | "todos");
                  setPage(0);
                }}
              >
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 space-y-2">
              {pokemonsQuery.isLoading
                ? Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)
                : pokemonsQuery.data?.items.map((pokemon) => (
                    <div key={pokemon.id} className="space-y-2">
                      {pokemon.cards.length === 0 ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-card/50 px-3 py-2">
                          <img src={pokemon.sprite_url ?? ""} alt="" className="size-10 object-contain opacity-50" />
                          <div className="min-w-40 flex-1">
                            <p className="font-medium text-muted-foreground">
                              <span className="mr-2 font-mono text-xs">
                                {padDex(pokemon.dex_number)}
                              </span>
                              {pokemon.name}
                            </p>
                            <p className="text-xs text-muted-foreground">Sem carta cadastrada</p>
                          </div>
                          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger className="w-52">
                              <SelectValue placeholder="Selecione a coleção" />
                            </SelectTrigger>
                            <SelectContent>
                              {(groupsQuery.data ?? []).map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="secondary" onClick={() => void handleCreateCard(pokemon.id)}>
                            Adicionar Carta
                          </Button>
                        </div>
                      ) : (
                        pokemon.cards.map((card) => (
                          <div
                            key={card.id}
                            className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2"
                          >
                            <img src={pokemon.sprite_url ?? ""} alt="" className="size-10 object-contain" />
                            <div className="min-w-40 flex-1">
                              <p className="font-medium">
                                <span className="mr-2 font-mono text-xs text-muted-foreground">
                                  {padDex(pokemon.dex_number)}
                                </span>
                                {pokemon.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {card.collection?.name ?? "Coleção a definir"}
                              </p>
                            </div>
                            <Select
                              value={card.status}
                              onValueChange={(value) => void changeStatus(card.id, value as CardStatus)}
                            >
                              <SelectTrigger className="w-52">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.filter((option) => option.value !== "todos").map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {pages}
              </span>
              <Button variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="contatos" className="mt-4">
            <div className="space-y-2">
              {(contactsQuery.data ?? []).map((row) => (
                <div key={row.id} className="rounded-xl border bg-card px-3 py-2 text-sm">
                  <p className="font-medium">{row.reference_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.intent} · {new Date(row.sent_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
              {contactsQuery.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <div className="max-w-md space-y-3 rounded-2xl border bg-card p-6">
              <Label htmlFor="whatsapp">Número do WhatsApp (com DDI e DDD)</Label>
              <Input
                id="whatsapp"
                value={whatsappValue}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="5584999693459"
              />
              <Button onClick={saveWhatsapp}>
                <Save className="size-4" /> Salvar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Componente: Aba de Cartas Extras
// ──────────────────────────────────────────────────

type CustomCardGroup = { id: string; name: string };

type CardDraft = {
  name: string;
  card_number: string;
  image_url: string;
  status: CardStatus;
};

const EMPTY_DRAFT: CardDraft = {
  name: "",
  card_number: "",
  image_url: "",
  status: "nao_tenho",
};

function CustomCardsAdmin({ enabled, groups }: { enabled: boolean; groups: CustomCardGroup[] }) {
  const queryClient = useQueryClient();
  const listCustom = useServerFn(listCustomCards);
  const addCustom = useServerFn(createCustomCard);
  const remove = useServerFn(deleteCard);
  const saveStatus = useServerFn(updateCardStatus);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<CardDraft>({ ...EMPTY_DRAFT });
  const [saving, setSaving] = useState(false);

  const customQuery = useQuery({
    queryKey: ["admin-custom-cards", selectedGroupId],
    queryFn: () => listCustom({ data: { groupId: selectedGroupId } }),
    enabled: enabled && Boolean(selectedGroupId),
  });

  async function handleSubmit() {
    if (!draft.name.trim()) {
      toast.error("O nome da carta é obrigatório.");
      return;
    }
    if (!selectedGroupId) {
      toast.error("Selecione uma coleção.");
      return;
    }
    setSaving(true);
    try {
      await addCustom({
        data: {
          name: draft.name.trim(),
          card_number: draft.card_number.trim() || null,
          image_url: draft.image_url.trim() || null,
          status: draft.status,
          collection_group_id: selectedGroupId,
        },
      });
      toast.success("Carta adicionada!");
      setDraft({ ...EMPTY_DRAFT });
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-custom-cards", selectedGroupId] });
      await queryClient.invalidateQueries({ queryKey: ["custom-cards"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cardId: string) {
    try {
      await remove({ data: { cardId } });
      toast.success("Carta removida.");
      await queryClient.invalidateQueries({ queryKey: ["admin-custom-cards", selectedGroupId] });
      await queryClient.invalidateQueries({ queryKey: ["custom-cards"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  async function handleStatusChange(cardId: string, next: CardStatus) {
    try {
      await saveStatus({ data: { cardId, status: next } });
      toast.success("Status atualizado!");
      await queryClient.invalidateQueries({ queryKey: ["admin-custom-cards", selectedGroupId] });
      await queryClient.invalidateQueries({ queryKey: ["custom-cards"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Seleção de coleção + botão nova carta */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione a coleção" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => { setShowForm(true); setDraft({ ...EMPTY_DRAFT }); }}
          disabled={!selectedGroupId}
        >
          <Plus className="size-4" /> Nova Carta
        </Button>
      </div>

      {/* Formulário de nova carta */}
      {showForm && (
        <div className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cc-name">Nome da Carta *</Label>
            <Input
              id="cc-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ex: Treinador Ash, Poção, etc."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cc-number">Número da Carta</Label>
            <Input
              id="cc-number"
              value={draft.card_number}
              onChange={(e) => setDraft({ ...draft, card_number: e.target.value })}
              placeholder="Ex: 001/165"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="cc-image">URL da Imagem</Label>
            <Input
              id="cc-image"
              value={draft.image_url}
              onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Preview da imagem */}
          {draft.image_url && (
            <div className="flex items-center gap-3 rounded-xl border bg-secondary/30 p-3 sm:col-span-2">
              <img
                src={draft.image_url}
                alt="Preview"
                className="h-24 w-auto rounded-lg object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <p className="text-sm text-muted-foreground">Preview da imagem</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Status inicial</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => setDraft({ ...draft, status: v as CardStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter((o) => o.value !== "todos").map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button onClick={handleSubmit} disabled={saving}>
              <Save className="size-4" /> {saving ? "Salvando..." : "Salvar Carta"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de cartas da coleção selecionada */}
      {!selectedGroupId ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Selecione uma coleção acima para ver e gerenciar suas cartas extras.
        </p>
      ) : customQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (customQuery.data ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma carta extra cadastrada nesta coleção. Clique em "Nova Carta" para começar.
        </p>
      ) : (
        <div className="space-y-2">
          {(customQuery.data as CustomCardRow[]).map((card) => (
            <div
              key={card.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2"
            >
              {card.image_url ? (
                <img src={card.image_url} alt="" className="size-12 rounded object-contain" />
              ) : (
                <div className="size-12 rounded bg-secondary" />
              )}
              <div className="min-w-40 flex-1">
                <p className="font-medium">{card.name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{card.card_number || "Sem número"}</p>
              </div>
              <Select
                value={card.status}
                onValueChange={(v) => void handleStatusChange(card.id, v as CardStatus)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.filter((o) => o.value !== "todos").map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleDelete(card.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ──────────────────────────────────────────────────
// Componente: Aba de Binders
// ──────────────────────────────────────────────────

type BinderDraft = {
  id: string | null;
  title: string;
  slug: string;
  description: string;
  rows: number;
  cols: number;
  pages: number;
  is_visible: boolean;
  sort_order: number;
};

const EMPTY_BINDER: BinderDraft = {
  id: null,
  title: "",
  slug: "",
  description: "",
  rows: 3,
  cols: 4,
  pages: 1,
  is_visible: false,
  sort_order: 0,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SlotEditState = {
  binderId: string;
  position: number;
  existing: BinderCard | null;
};

function BindersAdmin({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const listAll = useServerFn(listAllBinders);
  const save = useServerFn(saveBinder);
  const remove = useServerFn(deleteBinder);
  const listCards = useServerFn(listBinderCards);
  const saveCard = useServerFn(saveBinderCard);
  const clearCard = useServerFn(clearBinderCard);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<BinderDraft>({ ...EMPTY_BINDER });
  const [saving, setSaving] = useState(false);
  const [selectedBinder, setSelectedBinder] = useState<Binder | null>(null);
  const [slotEdit, setSlotEdit] = useState<SlotEditState | null>(null);
  const [sheet, setSheet] = useState(0);


  const bindersQuery = useQuery({
    queryKey: ["admin-binders"],
    queryFn: () => listAll(),
    enabled,
  });

  const cardsQuery = useQuery({
    queryKey: ["admin-binder-cards", selectedBinder?.id],
    queryFn: () => listCards({ data: { binderId: selectedBinder!.id } }),
    enabled: enabled && Boolean(selectedBinder),
  });

  function openNew() {
    setDraft({ ...EMPTY_BINDER, sort_order: (bindersQuery.data?.length ?? 0) });
    setShowForm(true);
  }

  function openEdit(binder: Binder) {
    setDraft({
      id: binder.id,
      title: binder.title,
      slug: binder.slug,
      description: binder.description ?? "",
      rows: binder.rows,
      cols: binder.cols,
      pages: binder.pages ?? 1,
      is_visible: binder.is_visible,
      sort_order: binder.sort_order,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!draft.title.trim()) { toast.error("Título obrigatório."); return; }
    if (!draft.slug.trim()) { toast.error("Slug obrigatório."); return; }
    setSaving(true);
    try {
      await save({ data: draft as BinderInput });
      toast.success(draft.id ? "Binder atualizado!" : "Binder criado!");
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-binders"] });
      await queryClient.invalidateQueries({ queryKey: ["binders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza? Isso remove o binder e todas as suas cartas.")) return;
    try {
      await remove({ data: { id } });
      toast.success("Binder removido.");
      if (selectedBinder?.id === id) setSelectedBinder(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-binders"] });
      await queryClient.invalidateQueries({ queryKey: ["binders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  async function handleToggleVisible(binder: Binder) {
    try {
      await save({
        data: {
          id: binder.id,
          title: binder.title,
          slug: binder.slug,
          description: binder.description,
          rows: binder.rows,
          cols: binder.cols,
          pages: binder.pages ?? 1,
          is_visible: !binder.is_visible,
          sort_order: binder.sort_order,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-binders"] });
      await queryClient.invalidateQueries({ queryKey: ["binders"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro.");
    }
  }

  // Grid editor
  const cardsByPos = new Map<number, BinderCard>(
    (cardsQuery.data ?? []).map((c) => [c.position, c]),
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho da aba */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {bindersQuery.data?.length ?? 0} binders cadastrados
        </p>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Novo Binder
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="b-title">Título *</Label>
            <Input
              id="b-title"
              value={draft.title}
              onChange={(e) => {
                const t = e.target.value;
                setDraft((d) => ({ ...d, title: t, slug: d.id ? d.slug : slugify(t) }));
              }}
              placeholder="Ex: Procuro — Delta Reign"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-slug">Slug (URL)</Label>
            <Input
              id="b-slug"
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="procuro-delta-reign"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-order">Ordem</Label>
            <Input
              id="b-order"
              type="number"
              value={draft.sort_order}
              onChange={(e) => setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-rows">Linhas</Label>
            <Input
              id="b-rows"
              type="number"
              min={1}
              max={10}
              value={draft.rows}
              onChange={(e) => setDraft((d) => ({ ...d, rows: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-cols">Colunas</Label>
            <Input
              id="b-cols"
              type="number"
              min={1}
              max={10}
              value={draft.cols}
              onChange={(e) => setDraft((d) => ({ ...d, cols: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="b-pages">Folhas (páginas)</Label>
            <Input
              id="b-pages"
              type="number"
              min={1}
              value={draft.pages}
              onChange={(e) => setDraft((d) => ({ ...d, pages: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="b-desc">Descrição (opcional)</Label>
            <Input
              id="b-desc"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Cartas que estou procurando..."
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              id="b-visible"
              checked={draft.is_visible}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, is_visible: v }))}
            />
            <Label htmlFor="b-visible">Visível ao público</Label>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="size-4" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Lista de binders */}
      {bindersQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (bindersQuery.data ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum binder ainda. Clique em "Novo Binder" para começar.
        </p>
      ) : (
        <div className="space-y-2">
          {(bindersQuery.data ?? []).map((binder) => (
            <div
              key={binder.id}
              className={`rounded-xl border bg-card transition-colors ${
                selectedBinder?.id === binder.id ? "border-primary" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <BookOpen className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{binder.title}</p>
                  <p className="text-xs text-muted-foreground">
                    /binder/{binder.slug} · {binder.rows} × {binder.cols} · {binder.pages ?? 1} folha(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={binder.is_visible}
                    onCheckedChange={() => void handleToggleVisible(binder)}
                    title={binder.is_visible ? "Ocultar" : "Publicar"}
                  />
                  <span className="text-xs text-muted-foreground">
                    {binder.is_visible ? "Visível" : "Oculto"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBinder(selectedBinder?.id === binder.id ? null : binder);
                  }}
                >
                  {selectedBinder?.id === binder.id ? "Fechar" : "Editar slots"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(binder)}>
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleDelete(binder.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              {/* Grade de slots */}
              {selectedBinder?.id === binder.id && (
                <div className="border-t p-4">
                  {(() => {
                    const totalPages = Math.max(1, binder.pages ?? 1);
                    const slots = binder.rows * binder.cols;
                    const current = Math.min(sheet, totalPages - 1);
                    const gridStyle = {
                      gridTemplateColumns: `repeat(${binder.cols}, minmax(0, 1fr))`,
                      maxWidth: `${binder.cols * 150}px`,
                    } as const;
                    return (
                      <>
                        <div className="mb-3 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={current <= 0}
                            onClick={() => setSheet(current - 1)}
                          >
                            Anterior
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Folha {current + 1} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={current + 1 >= totalPages}
                            onClick={() => setSheet(current + 1)}
                          >
                            Próxima
                          </Button>
                        </div>
                        {cardsQuery.isLoading ? (
                          <div className="grid gap-2" style={gridStyle}>
                            {Array.from({ length: slots }).map((_, i) => (
                              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid gap-2" style={gridStyle}>
                            {Array.from({ length: slots }).map((_, i) => {
                              const pos = current * slots + i;
                              const card = cardsByPos.get(pos);
                              return (
                                <button
                                  key={pos}
                                  type="button"
                                  onClick={() =>
                                    setSlotEdit({ binderId: binder.id, position: pos, existing: card ?? null })
                                  }
                                  className={`aspect-[2/3] overflow-hidden rounded-lg border-2 transition-all ${
                                    card
                                      ? "border-primary/40 bg-card hover:border-primary"
                                      : "border-dashed border-border/60 bg-card/40 hover:border-primary/50"
                                  }`}
                                >
                                  {card ? (
                                    card.image_url ? (
                                      <img
                                        src={card.image_url}
                                        alt={card.card_name ?? ""}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
                                        {card.card_name ?? "Sem imagem"}
                                      </div>
                                    )
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground/40">
                                      <Plus className="size-4" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Dialog de edição de slot */}
      {slotEdit && (
        <SlotDialog
          state={slotEdit}
          onClose={() => setSlotEdit(null)}
          onSaved={async () => {
            setSlotEdit(null);
            await queryClient.invalidateQueries({
              queryKey: ["admin-binder-cards", slotEdit.binderId],
            });
            await queryClient.invalidateQueries({ queryKey: ["binder"] });
          }}
          saveCard={saveCard}
          clearCard={clearCard}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// Dialog de edição de slot
// ──────────────────────────────────────────────────

type SlotCardDraft = {
  card_name: string;
  image_url: string;
  set_name: string;
  condition: string;
  price: string;
  status: BinderCardStatus;
  notes: string;
};

const EMPTY_SLOT: SlotCardDraft = {
  card_name: "",
  image_url: "",
  set_name: "",
  condition: "",
  price: "",
  status: "available",
  notes: "",
};

const SLOT_STATUS_OPTS: { value: BinderCardStatus; label: string }[] = [
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservado" },
  { value: "sold", label: "Vendido / Trocado" },
];

function SlotDialog({
  state,
  onClose,
  onSaved,
  saveCard,
  clearCard,
}: {
  state: SlotEditState;
  onClose: () => void;
  onSaved: () => Promise<void>;
  saveCard: ReturnType<typeof useServerFn<typeof saveBinderCard>>;
  clearCard: ReturnType<typeof useServerFn<typeof clearBinderCard>>;
}) {
  const { existing } = state;
  const [draft, setDraft] = useState<SlotCardDraft>(
    existing
      ? {
          card_name: existing.card_name ?? "",
          image_url: existing.image_url ?? "",
          set_name: existing.set_name ?? "",
          condition: existing.condition ?? "",
          price: existing.price != null ? String(existing.price) : "",
          status: (existing.status as BinderCardStatus) ?? "available",
          notes: existing.notes ?? "",
        }
      : { ...EMPTY_SLOT },
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await saveCard({
        data: {
          id: existing?.id ?? null,
          binder_id: state.binderId,
          position: state.position,
          card_name: draft.card_name.trim() || null,
          image_url: draft.image_url.trim() || null,
          set_name: draft.set_name.trim() || null,
          condition: draft.condition.trim() || null,
          price: draft.price.trim() ? Number(draft.price) : null,
          status: draft.status,
          notes: draft.notes.trim() || null,
        },
      });
      toast.success("Slot salvo!");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    if (!existing) return;
    if (!confirm("Limpar este slot?")) return;
    try {
      await clearCard({ data: { id: existing.id } });
      toast.success("Slot limpo.");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Editar slot" : "Preencher slot"}{" "}
            <span className="text-muted-foreground text-sm font-normal">#{state.position + 1}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="sd-name">Nome da Carta</Label>
            <Input
              id="sd-name"
              value={draft.card_name}
              onChange={(e) => setDraft((d) => ({ ...d, card_name: e.target.value }))}
              placeholder="Ex: Pikachu ex, Charizard V..."
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="sd-image">URL da Imagem</Label>
            <Input
              id="sd-image"
              value={draft.image_url}
              onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          {draft.image_url && (
            <div className="flex items-center gap-3 rounded-xl border bg-secondary/30 p-2 sm:col-span-2">
              <img
                src={draft.image_url}
                alt="Preview"
                className="h-20 w-auto rounded object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <p className="text-xs text-muted-foreground">Preview</p>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="sd-set">Set / Edição</Label>
            <Input
              id="sd-set"
              value={draft.set_name}
              onChange={(e) => setDraft((d) => ({ ...d, set_name: e.target.value }))}
              placeholder="Ex: Scarlet & Violet 151"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sd-cond">Condição</Label>
            <Input
              id="sd-cond"
              value={draft.condition}
              onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value }))}
              placeholder="Ex: NM, LP, MP..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sd-price">Preço (R$)</Label>
            <Input
              id="sd-price"
              type="number"
              min="0"
              step="0.01"
              value={draft.price}
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => setDraft((d) => ({ ...d, status: v as BinderCardStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_STATUS_OPTS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="sd-notes">Notas internas</Label>
            <Input
              id="sd-notes"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Observações (não aparecem no site)"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="size-4" /> Cancelar
          </Button>
          {existing ? (
            <Button variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={handleClear}>
              <Trash2 className="size-4" /> Limpar slot
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
