export type CardStatus = "tenho_full_art" | "tenho_comum" | "nao_tenho" | "nao_existe";

export const STATUS_META: Record<CardStatus, { label: string; short: string; dot: string; chip: string }> = {
  tenho_full_art: {
    label: "Full Art conquistada",
    short: "Full Art",
    dot: "bg-success",
    chip: "bg-success/15 text-success border-success/40",
  },
  tenho_comum: {
    label: "Tenho a comum, falta a Full Art",
    short: "Só comum",
    dot: "bg-warning",
    chip: "bg-warning/20 text-warning-foreground border-warning/50",
  },
  nao_tenho: {
    label: "Ainda não tenho nenhuma versão",
    short: "Não tenho",
    dot: "bg-destructive",
    chip: "bg-destructive/15 text-destructive border-destructive/40",
  },
  nao_existe: {
    label: "Não existe Full Art",
    short: "Não existe",
    dot: "bg-success",
    chip: "bg-success/15 text-success border-success/40",
  },
};

export const STATUS_OPTIONS: { value: CardStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "tenho_full_art", label: "Já tenho a Full Art" },
  { value: "tenho_comum", label: "Tenho só a comum" },
  { value: "nao_tenho", label: "Ainda não tenho" },
  { value: "nao_existe", label: "Não existe Full Art" },
];

export const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function padDex(dex: number) {
  return `#${String(dex).padStart(4, "0")}`;
}
