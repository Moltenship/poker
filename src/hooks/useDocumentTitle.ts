import { useEffect } from "react";

/**
 * Sets document.title while the component is mounted, restoring
 * the provided `fallback` (defaults to "Planning Poker") on unmount.
 */
export function useDocumentTitle(title: string | undefined, fallback = "Planning Poker"): void {
  useEffect(() => {
    if (title) {
      document.title = `${title} — ${fallback}`;
    }
    return () => {
      document.title = fallback;
    };
  }, [title, fallback]);
}
