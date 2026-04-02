export interface CardSet {
  name: string;
  values: string[];
}

export const FIBONACCI: CardSet = {
  name: "Fibonacci",
  values: ["1", "2", "3", "5", "8", "13", "21"],
};

export const FIBONACCI_EXTENDED: CardSet = {
  name: "Fibonacci Extended",
  values: ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"],
};

/** Detects whether a card set matches a known preset. */
export function detectPreset(cards: string[]): "fibonacci" | "extended" | "custom" {
  const fibMatch =
    cards.length === FIBONACCI.values.length && cards.every((c, i) => c === FIBONACCI.values[i]);
  if (fibMatch) {
    return "fibonacci";
  }

  const extMatch =
    cards.length === FIBONACCI_EXTENDED.values.length &&
    cards.every((c, i) => c === FIBONACCI_EXTENDED.values[i]);
  if (extMatch) {
    return "extended";
  }

  return "custom";
}

export function parseCardValue(value: string): number | null {
  if (value === "½") {
    return 0.5;
  }
  const n = parseFloat(value);
  if (!isNaN(n)) {
    return n;
  }
  return null;
}

export function isNumericCard(value: string): boolean {
  return parseCardValue(value) !== null;
}
