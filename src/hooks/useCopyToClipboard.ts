import { useCallback, useState } from "react";

/** Duration (ms) the `copied` flag stays `true` after a successful copy. */
const COPIED_RESET_MS = 2_000;

/**
 * Copies the given `text` to the clipboard and exposes a transient
 * `copied` boolean for UI feedback.
 */
export function useCopyToClipboard(text: string): { copied: boolean; copy: () => void } {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / insecure contexts
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }, [text]);

  return { copied, copy };
}
