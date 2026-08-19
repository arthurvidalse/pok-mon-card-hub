export function generateTemplateCsv(cards: { name: string; set: string; localId: string }[]): string {
  const header = "nome,coleção,número,quantidade,condição,preço\n";
  const rows = cards.map(c => `"${c.name}","${c.set}","${c.localId}","","NM",""`);
  return header + rows.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export type CsvRow = {
  nome: string;
  coleção: string;
  número: string;
  quantidade: string;
  condição: string;
  preço: string;
};

export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: any = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    
    if (row.nome && row.coleção && row.número) {
      rows.push(row as CsvRow);
    }
  }

  return rows;
}
