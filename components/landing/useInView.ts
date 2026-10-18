"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vrai dès que l'élément entre dans la fenêtre (une seule fois). Sans
 * IntersectionObserver, ou si l'utilisateur a demandé moins de mouvement,
 * l'élément est considéré comme visible tout de suite.
 */
export function useInView<T extends Element = HTMLDivElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduit || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}
