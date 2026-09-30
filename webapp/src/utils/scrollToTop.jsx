import { useEffect, useRef, useState, useCallback } from "react";

/**
 * @function useScrollToTop
 * @description Hook to detect scroll and provide a function to scroll to the top,
 * regardless of whether the scroll happens on the window or an internal container.
 * @param {number} threshold - Scroll distance from which the button appears.
 * @returns {{ isVisible: boolean, scrollToTop: function }}
 */
export default function useScrollToTop(threshold = 100) {
  const [isVisible, setIsVisible] = useState(false);
  const lastScrollTarget = useRef(window);

  // NOTA: O threshold define a distância de scroll a partir da qual o botão de "scroll to top" aparece, o valor pode ser ajustado!

  useEffect(() => {
    const handleScroll = (event) => {
      const target = event?.target;
      let scrollTop = 0;

      // Se o evento veio de um elemento real com scrollTop (não document/window)
      if (
        target &&
        target.nodeType === 1 &&
        typeof target.scrollTop === "number"
      ) {
        scrollTop = target.scrollTop;
        lastScrollTarget.current = target;
      } else {
        // Caso o evento não venha de um elemento com scrollTop, considera o window
        scrollTop =
          window.scrollY ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0;
        lastScrollTarget.current = window;
      }

      setIsVisible(scrollTop > threshold); // Atualiza a visibilidade do botão com base no scroll atual
    };

    handleScroll({ target: window }); // Inicializa a visibilidade do botão com base no scroll atual do window

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Listener no document em fase de captura (apanha scroll de qualquer elemento interno)
    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    // cleanup para remover os event listeners de scroll ao desmontar o componente
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });

    const target = lastScrollTarget.current;
    if (target && target !== window && typeof target.scrollTo === "function") {
      target.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return { isVisible, scrollToTop };
}
