import { useEffect } from "react";

// Os editores de e-mail (GrapesJS) precisam de uma política de segurança mais larga do que o resto do site (ver webapp/public/.htaccess), e a política
// é definida quando a página carrega, não quando se navega dentro da app. Por isso, se se chegou ao editor navegando a partir de outra página,
// recarrega-se uma vez no mesmo endereço para o servidor enviar a política do editor. Só em produção (em desenvolvimento não há política).
const EDITOR_PATH = /^\/admin\/(templates|communications)\/\d+\/editor/;

function loadedOnEditor() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    return !!nav && EDITOR_PATH.test(new URL(nav.name).pathname);
  } catch {
    return true; // sem forma de saber: não recarrega (evita ciclos)
  }
}

export default function ReloadForPolicy({ children }) {
  const mustReload = import.meta.env.PROD && !loadedOnEditor();
  useEffect(() => {
    if (mustReload) window.location.reload();
  }, [mustReload]);
  return mustReload ? null : children;
}
