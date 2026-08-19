export const VARIANTS = ["comum", "reverse foil"] as const;
export type Variant = (typeof VARIANTS)[number];

export const DEFAULT_VARIANT: Variant = "comum";

export function normalizeVariant(value?: string | null): Variant {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return DEFAULT_VARIANT;
  if (v.startsWith("reverse") || v === "rev" || v === "rf") return "reverse foil";
  return "comum";
}

export function variantLabel(value?: string | null): string {
  return normalizeVariant(value) === "reverse foil" ? "Reverse Foil" : "Comum";
}
