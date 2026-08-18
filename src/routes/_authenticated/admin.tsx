import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Plus, Save, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
            <TabsTrigger value="bulk">Bulk</TabsTrigger>
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

          <TabsContent value="bulk" className="mt-4">
            <BulkAdmin enabled={adminQuery.data?.isAdmin === true} />
          </TabsContent>


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

