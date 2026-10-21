import { useRef, useState } from "react";
import axios from "axios";

// Pede todas as páginas de uma lista paginada do servidor ({ rows, total }) com os filtros atuais, 200 de cada vez
export async function fetchAllPages(url, params = {}, pageSize = 200) {
  let rows = [];
  let total = Infinity;
  for (let page = 1; rows.length < total; page++) {
    const { data } = await axios.get(url, { params: { ...params, page, limit: pageSize } });
    rows = rows.concat(data.rows);
    total = data.total;
    if (!data.rows.length) break;
  }
  return rows;
}

// Corre `fn` para cada item, no máximo `size` de cada vez (apagar centenas de ficheiros sem centenas de pedidos em simultâneo)
export async function runInChunks(items, fn, size = 5) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

// Seleção em massa de uma grelha paginada (Multimédia, IECs): guarda os itens escolhidos (id → item), mesmo os de
// outras páginas. "Selecionar tudo" recebe uma função que devolve todos os itens que correspondem aos filtros atuais.
export default function useBulkSelection() {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selected, setSelected] = useState({});
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const requestRef = useRef(0);

  function toggle(item) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  }

  // Substitui a seleção por todos os itens devolvidos por `loadAll` (lança o erro para a página o mostrar)
  async function selectAll(loadAll) {
    const request = ++requestRef.current;
    setIsSelectingAll(true);
    try {
      const items = await loadAll();
      if (request === requestRef.current) setSelected(Object.fromEntries(items.map((item) => [item.id, item])));
    } finally {
      if (request === requestRef.current) setIsSelectingAll(false);
    }
  }

  function clear() {
    requestRef.current++;
    setIsSelectingAll(false);
    setSelected({});
  }

  // Entrar na seleção múltipla só mostra as caixas de seleção (nada selecionado): o utilizador escolhe um a um ou usa
  // "Selecionar tudo" na barra
  function enter() {
    clear();
    setIsSelectMode(true);
  }

  function exit() {
    clear();
    setIsSelectMode(false);
  }

  const items = Object.values(selected);
  return { isSelectMode, isSelectingAll, items, count: items.length, isSelected: (item) => !!selected[item.id], toggle, selectAll, clear, enter, exit };
}
