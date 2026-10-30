import { useEffect, useRef } from "react";

// Entrada suave do conteúdo de uma página (classe .page-enter, ver index.css): repete a animação sempre que a rota muda, SEM remontar
// o conteúdo (uma `key` na rota perderia o estado das páginas que mudam só de parâmetro, como o e-Learning ao passar de tópico).
export default function usePageEnter(routeKey) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("page-enter");
    void el.offsetWidth; // força o recálculo para a animação recomeçar
    el.classList.add("page-enter");
  }, [routeKey]);
  return ref;
}
