import { useCallback, useState } from "react";

const COPIED_RESET_MS = 2000;

/** Copies text to the clipboard and briefly exposes a copied flag for UI feedback. */
export function useCopyLink(text: string) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }, [text]);

  return { copied, copy };
}
