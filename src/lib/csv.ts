import { VARIANTS } from "./variants";

export type TemplateCard = {
  name: string;
  set: string;
  localId: string;
  rarity?: string | null;
};

export function generateTemplateCsv(cards: TemplateCard[]): string {
  const header = "nome,coleção,número,variante,raridade,quantidade,condição,preço\n";
  const rows: string[] = [];
  for (const c of cards) {
    for (const variant of VARIANTS) {
      rows.push(
        `"${c.name}","${c.set}","${c.localId}","${variant}","${c.rarity ?? ""}","","NM",""`,
      );
    }
  }
  return header + rows.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type CsvRow = {
  nome: string;
  coleção: string;
  número: string;
  variante: string;
  raridade: string;
  quantidade: string;
  condição: string;
  preço: string;
};

export function parseCsv(text: string): CsvRow[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }

    if (row.nome && row["coleção"] && row["número"]) {
      rows.push(row as unknown as CsvRow);
    }
  }

  return rows;
}
