export type CardSet = {
  name: string;
  values: string[];
};

export const FIBONACCI: CardSet = {
  name: "Fibonacci",
  values: ["1", "2", "3", "5", "8", "13", "21"],
};

export const FIBONACCI_EXTENDED: CardSet = {
  name: "Fibonacci Extended",
  values: ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
};

export const DEFAULT_CARD_SETS: CardSet[] = [FIBONACCI, FIBONACCI_EXTENDED];

export function parseCardValue(value: string): number | null {
  if (value === "½") return 0.5;
  const n = parseFloat(value);
  if (!isNaN(n)) return n;
  return null;
}

export function isNumericCard(value: string): boolean {
  return parseCardValue(value) !== null;
}
