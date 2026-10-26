import { cloneWithNewIds } from "./helpers";

// Zona da raiz da página no Puck (Root desenha <DropZone zone="default-zone">).
export const ROOT_ZONE = "root:default-zone";

const KEY = "el-editor-clipboard";

// localStorage (não a área de transferência do sistema): funciona entre
// separadores/lições sem pedir permissões ao browser, e nunca mistura
// texto copiado de outro sítio com blocos do editor.
export function writeClipboard(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ items, copiedAt: Date.now() }));
    window.dispatchEvent(new Event("el-clipboard"));
    return true;
  } catch {
    return false;
  }
}

export function readClipboard() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items.filter((i) => i && i.type && i.props) : null;
  } catch {
    return null;
  }
}

// Valores por omissão do widget por baixo dos copiados (também nos blocos
// dentro de slots) — blocos de secções prontas, ou guardados antes de um
// campo novo existir, ficam com o resto das predefinições, como um bloco
// arrastado do painel.
export function applyDefaults(node, config) {
  if (!node?.type || !node.props) return node;
  const defaults = config.components[node.type]?.defaultProps || {};
  const props = { ...defaults, ...node.props };
  if (defaults.__design || node.props.__design) {
    props.__design = {
      container: { ...defaults.__design?.container, ...node.props.__design?.container },
      style: { ...defaults.__design?.style, ...node.props.__design?.style },
      layout: { ...defaults.__design?.layout, ...node.props.__design?.layout },
    };
  }
  Object.entries(props).forEach(([k, v]) => {
    if (Array.isArray(v) && v.length && v.every((c) => c && c.type && c.props)) props[k] = v.map((c) => applyDefaults(c, config));
  });
  node.props = props;
  return node;
}

/**
 * Insere blocos (com ids novos) a seguir ao bloco selecionado — ou no fim
 * da página, se nada estiver selecionado / `atEnd`. Blocos de tipos que já
 * não existem no config são ignorados.
 */
export function insertItems(puck, items, { atEnd = false } = {}) {
  const { appState, dispatch, config } = puck;
  const valid = (items || []).filter((i) => config.components[i.type]);
  if (valid.length === 0) return 0;

  const selector = appState.ui?.itemSelector;
  let zone = ROOT_ZONE;
  let index = appState.data?.content?.length || 0;
  if (!atEnd && selector && typeof selector.index === "number") {
    zone = selector.zone || ROOT_ZONE;
    index = selector.index + 1;
  }

  valid.forEach((item, i) => {
    const clone = cloneWithNewIds(item);
    applyDefaults(clone, config);
    // "insert" cria o bloco com os valores por omissão; "replace" troca-o
    // logo a seguir pelo bloco copiado completo (incluindo filhos em slots).
    dispatch({ type: "insert", componentType: clone.type, destinationIndex: index + i, destinationZone: zone, id: clone.props.id, recordHistory: false });
    dispatch({ type: "replace", destinationIndex: index + i, destinationZone: zone, data: clone });
  });
  return valid.length;
}
