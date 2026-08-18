import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Upload, Plus, Trash2, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSets, getSet } from "@/lib/tcgdex";
import { generateTemplateCsv, downloadCsv, parseCsv, type CsvRow } from "@/lib/csv";
import { listPriceRules, upsertPriceRule, deletePriceRule, listBulkCardsAdmin, updateBulkCard, deleteBulkCard, importBulkCards } from "@/lib/bulk-admin.functions";

export function BulkAdmin({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div className="space-y-6">
      <Tabs defaultValue="regras" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="regras">Regras de Preço</TabsTrigger>
          <TabsTrigger value="export">Baixar Modelo</TabsTrigger>
          <TabsTrigger value="import">Importar Planilha</TabsTrigger>
          <TabsTrigger value="manual">Gestão Manual</TabsTrigger>
        </TabsList>
        
        <TabsContent value="regras">
          <PriceRulesAdmin />
        </TabsContent>
        
        <TabsContent value="export">
          <ExportAdmin />
        </TabsContent>
        
        <TabsContent value="import">
          <ImportAdmin />
        </TabsContent>
        
        <TabsContent value="manual">
          <ManualAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PriceRulesAdmin() {
  const queryClient = useQueryClient();
  const getRules = useServerFn(listPriceRules);
  const saveRule = useServerFn(upsertPriceRule);
  const delRule = useServerFn(deletePriceRule);
  
  const rulesQuery = useQuery({ queryKey: ["bulk-price-rules"], queryFn: () => getRules() });
  
  const [rarity, setRarity] = useState("");
  const [condition, setCondition] = useState("");
  const [price, setPrice] = useState("");
  
  async function handleSave() {
    if (!rarity || !condition || !price) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    try {
      await saveRule({ data: { rarity, condition, price: parseFloat(price) } });
      toast.success("Regra salva com sucesso!");
      setRarity("");
      setCondition("");
      setPrice("");
      queryClient.invalidateQueries({ queryKey: ["bulk-price-rules"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  }
  
  async function handleDelete(id: string) {
    try {
      await delRule({ data: { id } });
      toast.success("Regra excluída");
      queryClient.invalidateQueries({ queryKey: ["bulk-price-rules"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center bg-card p-4 rounded-xl border">
        <Input placeholder="Raridade (ex: Common)" value={rarity} onChange={(e) => setRarity(e.target.value)} />
        <Input placeholder="Condição (ex: NM)" value={condition} onChange={(e) => setCondition(e.target.value)} />
        <Input type="number" step="0.01" placeholder="Preço (ex: 0.50)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button onClick={handleSave}><Plus className="w-4 h-4 mr-2" /> Adicionar</Button>
      </div>
      
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Raridade</th>
              <th className="px-4 py-3">Condição</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(rulesQuery.data || []).map(rule => (
              <tr key={rule.id} className="border-t">
                <td className="px-4 py-3 font-medium">{rule.rarity}</td>
                <td className="px-4 py-3">{rule.condition}</td>
                <td className="px-4 py-3">R$ {rule.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {rulesQuery.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Nenhuma regra cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportAdmin() {
  const [sets, setSets] = useState<{id: string, name: string}[]>([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [loading, setLoading] = useState(false);
  
  useQuery({
    queryKey: ["tcgdex-sets"],
    queryFn: async () => {
      const data = await listSets();
      setSets(data);
      return data;
    }
  });
  
  async function handleDownload() {
    if (!selectedSet) return;
    
    setLoading(true);
    try {
      const details = await getSet(selectedSet);
      const csvString = generateTemplateCsv(details.cards.map(c => ({
        name: c.name,
        set: selectedSet,
        localId: c.localId
      })));
      downloadCsv(`bulk_${selectedSet}_template.csv`, csvString);
      toast.success("Planilha gerada com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao baixar coleção da TCGdex");
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="bg-card p-6 rounded-xl border max-w-md">
      <h3 className="font-semibold mb-4">Gerar Planilha Modelo</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Selecione uma coleção para buscar todas as cartas oficiais na TCGdex e gerar um CSV pronto para preenchimento.
      </p>
      
      <div className="space-y-4">
        <Select value={selectedSet} onValueChange={setSelectedSet}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a coleção..." />
          </SelectTrigger>
          <SelectContent>
            {sets.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button className="w-full" onClick={handleDownload} disabled={!selectedSet || loading}>
          {loading ? "Buscando na TCGdex..." : <><Download className="w-4 h-4 mr-2" /> Baixar Planilha CSV</>}
        </Button>
      </div>
    </div>
  );
}

type PreviewRow = {
  isValid: boolean;
  row: any;
  calcPrice: number | null;
  hasRule: boolean;
};

function ImportAdmin() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const getRules = useServerFn(listPriceRules);
  const doImport = useServerFn(importBulkCards);
  const queryClient = useQueryClient();
  
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoadingPreview(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      
      // Filter out rows without quantity or zero
      const validRows = rows.filter(r => {
        const q = parseInt(r.quantidade, 10);
        return !isNaN(q) && q > 0;
      });
      
      if (validRows.length === 0) {
        toast.error("Nenhuma carta com quantidade > 0 encontrada no arquivo.");
        return;
      }
      
      // Group by set to batch TCGdex requests
      const sets = new Set(validRows.map(r => r.coleção));
      const setDetailsMap = new Map<string, any>();
      
      for (const setId of sets) {
        try {
          const details = await getSet(setId);
          setDetailsMap.set(setId, details);
        } catch (err) {
          console.error(`Failed to fetch set ${setId}`, err);
        }
      }
      
      const rules = await getRules();
      const rulesMap = new Map<string, number>();
      for (const r of rules) {
        rulesMap.set(`${r.rarity}_${r.condition}`, r.price);
      }
      
      const previewData: PreviewRow[] = validRows.map(csvRow => {
        const setDetails = setDetailsMap.get(csvRow.coleção);
        const cardDetails = setDetails?.cards.find((c: any) => c.localId === csvRow.número);
        
        let price = null;
        let hasRule = true;
        const condition = csvRow.condição || "NM";
        const rarity = cardDetails?.rarity || "Unknown";
        
        if (csvRow.preço) {
          price = parseFloat(csvRow.preço);
        } else {
          const rulePrice = rulesMap.get(`${rarity}_${condition}`);
          if (rulePrice !== undefined) {
            price = rulePrice;
          } else {
            hasRule = false;
          }
        }
        
        return {
          isValid: !!cardDetails,
          hasRule,
          calcPrice: price,
          row: {
            set_id: csvRow.coleção,
            set_name: setDetails?.name || csvRow.coleção,
            local_id: csvRow.número,
            card_name: cardDetails?.name || csvRow.nome,
            image_url: cardDetails?.image ? `${cardDetails.image}/high.png` : null, // Assuming TCGdex format
            rarity: rarity,
            condition,
            quantity: parseInt(csvRow.quantidade, 10),
            price_override: csvRow.preço ? parseFloat(csvRow.preço) : null
          }
        };
      });
      
      setPreview(previewData);
      
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar arquivo");
    } finally {
      setLoadingPreview(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  
  async function confirmImport() {
    const toImport = preview.filter(p => p.isValid).map(p => p.row);
    if (toImport.length === 0) return;
    
    setImporting(true);
    try {
      const res = await doImport({ data: { rows: toImport } });
      toast.success(`${res.count} cartas importadas com sucesso!`);
      setPreview([]);
      queryClient.invalidateQueries({ queryKey: ["bulk-cards-admin"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao importar");
    } finally {
      setImporting(false);
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Input type="file" accept=".csv" onChange={handleFile} ref={fileInputRef} className="max-w-xs" disabled={loadingPreview || importing} />
        {loadingPreview && <span className="text-sm text-muted-foreground animate-pulse">Processando dados e buscando TCGdex...</span>}
      </div>
      
      {preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Prévia ({preview.length} cartas)</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreview([])}>Cancelar</Button>
              <Button onClick={confirmImport} disabled={importing}>
                {importing ? "Importando..." : <><Upload className="w-4 h-4 mr-2" /> Confirmar Importação</>}
              </Button>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs sticky top-0">
                <tr>
                  <th className="px-4 py-3">Carta</th>
                  <th className="px-4 py-3">Coleção</th>
                  <th className="px-4 py-3 text-center">Qtd</th>
                  <th className="px-4 py-3 text-center">Condição</th>
                  <th className="px-4 py-3">Preço</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className={`border-t ${!p.isValid ? 'bg-destructive/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.row.card_name}</div>
                      <div className="text-xs text-muted-foreground">{p.row.rarity || 'Unknown rarity'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {p.row.set_name} <span className="text-muted-foreground">#{p.row.local_id}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{p.row.quantity}</td>
                    <td className="px-4 py-3 text-center">{p.row.condition}</td>
                    <td className="px-4 py-3">
                      {p.calcPrice !== null ? (
                        <span>R$ {p.calcPrice.toFixed(2)}</span>
                      ) : (
                        <span className="text-warning text-xs font-medium bg-warning/10 px-2 py-1 rounded">Sem regra</span>
                      )}
                      {p.row.price_override && <span className="ml-2 text-[10px] bg-primary/20 px-1 rounded text-primary">Override</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualAdmin() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  
  const queryClient = useQueryClient();
  const getCards = useServerFn(listBulkCardsAdmin);
  const updateCard = useServerFn(updateBulkCard);
  const delCard = useServerFn(deleteBulkCard);
  
  const cardsQuery = useQuery({
    queryKey: ["bulk-cards-admin", search, page],
    queryFn: () => getCards({ data: { search, page, pageSize: 20 } })
  });
  
  async function handleUpdate(id: string, updates: any) {
    try {
      await updateCard({ data: { id, ...updates } });
      toast.success("Atualizado!");
      queryClient.invalidateQueries({ queryKey: ["bulk-cards-admin"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar");
    }
  }
  
  async function handleDelete(id: string) {
    if (!confirm("Excluir esta carta do estoque?")) return;
    try {
      await delCard({ data: { id } });
      toast.success("Excluída!");
      queryClient.invalidateQueries({ queryKey: ["bulk-cards-admin"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          className="pl-9" 
          placeholder="Buscar carta ou coleção..." 
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>
      
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Carta</th>
              <th className="px-4 py-3">Raridade</th>
              <th className="px-4 py-3">Qtd</th>
              <th className="px-4 py-3">Condição</th>
              <th className="px-4 py-3">Price Override</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(cardsQuery.data?.items || []).map(card => (
              <tr key={card.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{card.card_name}</div>
                  <div className="text-xs text-muted-foreground">{card.set_name} #{card.local_id}</div>
                </td>
                <td className="px-4 py-3 text-xs">{card.rarity}</td>
                <td className="px-4 py-3">
                  <Input 
                    type="number" 
                    className="w-20 h-8 text-sm" 
                    defaultValue={card.quantity} 
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val !== card.quantity) handleUpdate(card.id, { quantity: val });
                    }}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input 
                    className="w-16 h-8 text-sm uppercase" 
                    defaultValue={card.condition} 
                    onBlur={(e) => {
                      const val = e.target.value.trim().toUpperCase();
                      if (val && val !== card.condition) handleUpdate(card.id, { condition: val });
                    }}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="w-24 h-8 text-sm" 
                    defaultValue={card.price_override || ''} 
                    placeholder="Auto"
                    onBlur={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      if (val !== card.price_override) handleUpdate(card.id, { price_override: val });
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(card.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total: {cardsQuery.data?.total || 0} cartas</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={(cardsQuery.data?.items.length || 0) < 20} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  );
}
