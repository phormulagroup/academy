// Operações sobre tabelas HTML (DOM) usadas pelo editor visual de tabelas.
// As novas células/linhas copiam a tag e os estilos das vizinhas (ex.: th do cabeçalho, td do corpo).
// Nota: colspan é tido em conta; rowspan não (as posições das colunas são calculadas por linha).

export const findCell = (node, container) => {
  const el = node?.nodeType === 1 ? node : node?.parentElement;
  const cell = el?.closest?.("td, th");
  return cell && container.contains(cell) ? cell : null;
};

const span = (cell) => Math.max(1, cell.colSpan || 1);

export const cellColumn = (cell) => {
  let col = 0;
  for (const c of cell.parentElement.cells) {
    if (c === cell) break;
    col += span(c);
  }
  return col;
};

export const cellRow = (cell) => Array.from(cell.closest("table").rows).indexOf(cell.parentElement);

const emptyClone = (cell) => {
  const copy = cell.cloneNode(false);
  copy.removeAttribute("rowspan");
  copy.removeAttribute("colspan");
  return copy;
};

const emptyRow = (template) => {
  const row = template.cloneNode(false);
  for (const c of template.cells) {
    const copy = emptyClone(c);
    if (span(c) > 1) copy.colSpan = span(c);
    row.appendChild(copy);
  }
  return row;
};

// Insere uma linha antes/depois da linha da célula; devolve a primeira célula nova
export function insertRow(cell, after) {
  const row = cell.parentElement;
  const table = row.closest("table");
  let newRow;
  if (after && row.parentElement.tagName === "THEAD") {
    // Abaixo do cabeçalho: nova linha no início do corpo (com o estilo das linhas do corpo)
    let body = table.tBodies[0];
    if (!body) body = table.appendChild(table.ownerDocument.createElement("tbody"));
    newRow = emptyRow(body.rows[0] || row);
    body.insertBefore(newRow, body.firstChild);
  } else {
    newRow = emptyRow(row);
    row.parentElement.insertBefore(newRow, after ? row.nextSibling : row);
  }
  return newRow.cells[0] || null;
}

// Insere uma coluna à esquerda/direita da célula; devolve a nova célula na linha atual
export function insertColumn(cell, after) {
  const table = cell.closest("table");
  const pos = cellColumn(cell) + (after ? span(cell) : 0);
  let result = null;
  for (const row of table.rows) {
    let start = 0;
    let done = false;
    for (const c of Array.from(row.cells)) {
      const end = start + span(c);
      if (start >= pos) {
        const copy = emptyClone(c.previousElementSibling || c);
        row.insertBefore(copy, c);
        if (row === cell.parentElement) result = copy;
        done = true;
        break;
      }
      if (pos > start && pos < end) {
        // A posição fica dentro de uma célula com colspan: alarga-a
        c.colSpan = span(c) + 1;
        done = true;
        break;
      }
      start = end;
    }
    if (!done && row.cells.length) {
      const copy = emptyClone(row.cells[row.cells.length - 1]);
      row.appendChild(copy);
      if (row === cell.parentElement) result = copy;
    }
  }
  updateColgroup(table, pos, true);
  return result;
}

export function deleteRow(cell) {
  const row = cell.parentElement;
  const section = row.parentElement;
  const table = row.closest("table");
  const index = Array.from(table.rows).indexOf(row);
  row.remove();
  if (section !== table && !section.rows.length) section.remove();
  const rows = table.rows;
  return rows.length ? rows[Math.min(index, rows.length - 1)].cells[0] || null : null;
}

export function deleteColumn(cell) {
  const table = cell.closest("table");
  const pos = cellColumn(cell);
  const current = cell.parentElement;
  let result = null;
  for (const row of Array.from(table.rows)) {
    let start = 0;
    for (const c of Array.from(row.cells)) {
      const end = start + span(c);
      if (pos >= start && pos < end) {
        if (span(c) > 1) c.colSpan = span(c) - 1;
        else {
          if (row === current) result = c.nextElementSibling || c.previousElementSibling;
          c.remove();
        }
        break;
      }
      start = end;
    }
    if (!row.cells.length) row.remove();
  }
  updateColgroup(table, pos, false);
  return result;
}

// <colgroup> simples (um <col> por coluna): acompanha as colunas inseridas/removidas
function updateColgroup(table, pos, insert) {
  const cols = table.querySelectorAll(":scope > colgroup > col");
  if (!cols.length || Array.from(cols).some((col) => col.hasAttribute("span"))) return;
  if (insert) {
    const ref = cols[Math.min(pos, cols.length - 1)];
    const copy = ref.cloneNode(false);
    ref.parentElement.insertBefore(copy, pos < cols.length ? ref : null);
  } else if (cols[pos]) cols[pos].remove();
}
