import { parseCardValue } from "./cards";

export interface AverageResult {
  average: number | null;
  numericCount: number;
  totalCount: number;
}

export function calculateAverage(votes: string[]): AverageResult {
  const totalCount = votes.length;
  const numericValues = votes.map(parseCardValue).filter((v): v is number => v !== null);
  const numericCount = numericValues.length;
  if (numericCount === 0) {
    return { average: null, numericCount, totalCount };
  }
  const average = numericValues.reduce((a, b) => a + b, 0) / numericCount;
  return { average, numericCount, totalCount };
}

export function findNearestCard(average: number, cardSet: string[]): string | null {
  const numericCards = cardSet
    .map((v) => ({ numeric: parseCardValue(v), value: v }))
    .filter((c): c is { value: string; numeric: number } => c.numeric !== null);
  if (numericCards.length === 0) {
    return null;
  }
  let nearest = numericCards[0];
  for (const card of numericCards) {
    if (Math.abs(card.numeric - average) < Math.abs(nearest.numeric - average)) {
      nearest = card;
    }
  }
  return nearest.value;
}
