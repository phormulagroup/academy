// Cache em memória, de curta duração, das consultas que quase todos os pedidos fazem: quem é o utilizador (papel, estado) e o que o seu
// papel pode fazer. Poupa duas idas à base de dados por pedido. A duração curta limita o atraso de uma mudança noutro processo; no mesmo
// processo, `clear()` (chamado depois de mudar utilizadores, funções ou permissões) aplica-a logo.
const TTL_MS = 20 * 1000;
const MAX_ENTRIES = 5000;

const stores = { user: new Map(), perm: new Map(), staff: new Map() };

function get(name, key) {
  const entry = stores[name].get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    stores[name].delete(key);
    return undefined;
  }
  return entry.value;
}

function set(name, key, value) {
  const store = stores[name];
  if (store.size >= MAX_ENTRIES) store.clear();
  store.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

// Devolve o valor em cache ou calcula-o (e guarda-o). Só guarda resultados definidos (nunca falhas).
async function cached(name, key, loader) {
  const hit = get(name, key);
  if (hit !== undefined) return hit;
  const value = await loader();
  return value === undefined ? value : set(name, key, value);
}

function clear() {
  for (const store of Object.values(stores)) store.clear();
}

module.exports = { cached, clear };
