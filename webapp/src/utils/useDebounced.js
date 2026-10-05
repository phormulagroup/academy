import { useEffect, useState } from "react";

// Valor que só muda depois de `delay` ms sem alterações: para pesquisas que vão ao servidor sem um pedido por tecla
export default function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
