import { useEffect, useRef } from "react";

/**
 * Saves scroll position to sessionStorage on unmount and restores it on mount.
 * Use a stable `key` per page/list (e.g. "community-feed", "news-list").
 */
export function useScrollRestoration(key: string) {
  const posRef = useRef(0);

  useEffect(() => {
    const storageKey = `scroll:${key}`;

    // Restore saved position (two rAFs to wait for full paint)
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const pos = parseInt(saved, 10);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => window.scrollTo(0, pos))
      );
      sessionStorage.removeItem(storageKey);
    }

    // Track position continuously so we have the correct value at unmount
    const onScroll = () => {
      posRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      // Save only when there's something to restore
      if (posRef.current > 0) {
        sessionStorage.setItem(storageKey, String(posRef.current));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
