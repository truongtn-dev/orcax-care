import { useEffect } from "react";

export function useHeroParallax(ref, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const section = ref.current;
    if (!section) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const content = section.querySelector(".hero-content");
    let ticking = false;

    const update = () => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        ticking = false;
        return;
      }

      const progress = Math.min(Math.max(-rect.top / (rect.height * 0.6 || 1), 0), 1);
      const offset = progress * 48;

      if (content) {
        content.style.transform = `translateY(${offset}px)`;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (content) content.style.transform = "";
    };
  }, [ref, enabled]);
}
