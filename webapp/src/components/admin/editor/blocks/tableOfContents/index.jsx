import { useEffect, useRef, useState } from "react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { colorField, selectField, sliderField, switchField } from "../../core/fields";
import { rule } from "../../core/css";
import "./styles.css";

const LEVELS = [
  { label: "Só H2", value: "2" },
  { label: "H2 e H3", value: "2-3" },
  { label: "H2 a H4", value: "2-4" },
];

const SELECTORS = { 2: "h2", "2-3": "h2,h3", "2-4": "h2,h3,h4" };

function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const sameItems = (a, b) => a.length === b.length && a.every((x, i) => x.id === b[i].id && x.text === b[i].text && x.level === b[i].level);

// Lista plana [{level}] → árvore, para os níveis inferiores ficarem
// dentro do título de cima (e a numeração sair 1, 1.1, 1.2, 2…).
function buildTree(items) {
  const min = Math.min(...items.map((i) => i.level));
  const root = { level: min - 1, children: [] };
  const stack = [root];
  items.forEach((it) => {
    const node = { ...it, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= it.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  return root.children;
}

function TocView({ title, levels, numbered, smoothScroll, scrollOffset, titleColor, linkColor, linkHoverColor, id, puck }) {
  const isEditing = puck?.isEditing;
  const navRef = useRef(null);
  const [items, setItems] = useState([]);
  const selector = SELECTORS[levels] || SELECTORS[2];

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    // ownerDocument e não `document`: no editor o conteúdo vive dentro do
    // iframe do canvas do Puck.
    const doc = nav.ownerDocument;
    const win = doc.defaultView || window;
    const scope = nav.closest(".el-root-content") || doc.body;
    const self = nav.closest(".el-element") || nav;
    let timer = null;

    const scan = () => {
      const used = new Set();
      const found = Array.from(scope.querySelectorAll(selector))
        .filter((h) => !self.contains(h) && !h.closest("[data-toc-ignore]"))
        .map((h) => {
          const text = (h.textContent || "").replace(/\s+/g, " ").trim();
          if (!text) return null;
          // Títulos sem id recebem um a partir do texto (único na página),
          // para os links do índice e os links #ancora partilhados.
          if (!h.id) {
            const base = slugify(text) || "seccao";
            let candidate = base;
            let n = 2;
            while (used.has(candidate) || (doc.getElementById(candidate) && doc.getElementById(candidate) !== h)) candidate = `${base}-${n++}`;
            h.id = candidate;
          }
          used.add(h.id);
          return { id: h.id, text, level: Number(h.tagName.slice(1)) || 2 };
        })
        .filter(Boolean);
      setItems((prev) => (sameItems(prev, found) ? prev : found));
    };

    const schedule = () => {
      win.clearTimeout(timer);
      timer = win.setTimeout(scan, 250);
    };

    // Primeira leitura adiada: os outros blocos da página podem ainda não
    // ter desenhado os títulos no mesmo ciclo.
    schedule();

    // Volta a ler enquanto se edita (títulos novos, texto alterado). As
    // mudanças dentro do próprio índice são ignoradas — senão cada
    // atualização do índice provocava outra leitura.
    const MO = win.MutationObserver || (typeof MutationObserver !== "undefined" ? MutationObserver : null);
    let mo = null;
    if (MO) {
      mo = new MO((muts) => {
        if (muts.every((m) => self.contains(m.target))) return;
        schedule();
      });
      mo.observe(scope, { childList: true, subtree: true, characterData: true });
    }
    return () => {
      win.clearTimeout(timer);
      mo?.disconnect();
    };
  }, [selector]);

  const goTo = (e, headingId) => {
    const doc = navRef.current?.ownerDocument;
    const el = doc?.getElementById(headingId);
    if (!el) return;
    e.preventDefault();
    const win = doc.defaultView || window;
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Compensa o cabeçalho fixo da app, que tapava o título de destino.
    el.style.scrollMarginTop = `${scrollOffset ?? 80}px`;
    el.scrollIntoView({ behavior: smoothScroll !== false && !reduce ? "smooth" : "auto", block: "start" });
    if (isEditing) return;
    try {
      win.history.replaceState(win.history.state, "", `#${headingId}`);
    } catch {
      /* sem history (ex.: sandbox) — o scroll já foi feito */
    }
    // Leva também o foco do teclado/leitor de ecrã para a secção.
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  };

  const empty = items.length === 0;
  const css = [
    rule(`[data-style-id="${id}"] .el-toc`, {
      "--el-toc-title": titleColor,
      "--el-toc-link": linkColor,
      "--el-toc-hover": linkHoverColor,
    }),
    // Sem títulos na página, esconde o bloco inteiro (incluindo o fundo e
    // o padding do invólucro), mas continua montado para voltar a ler.
    empty && !isEditing ? `[data-style-id="${id}"]{display:none}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const renderList = (nodes) => {
    const List = numbered ? "ol" : "ul";
    return (
      <List className="el-toc__list">
        {nodes.map((n) => (
          <li key={n.id} className="el-toc__item">
            <a className="el-toc__link" href={`#${n.id}`} onClick={(e) => goTo(e, n.id)}>
              {n.text}
            </a>
            {n.children.length > 0 && renderList(n.children)}
          </li>
        ))}
      </List>
    );
  };

  return (
    <nav ref={navRef} className={`el-toc${numbered ? " el-toc--numbered" : ""}`} aria-label={title || "Índice"}>
      {css && <style>{css}</style>}
      {title && <p className="el-toc__title">{title}</p>}
      {empty ? isEditing && <p className="el-toc__empty">Os títulos da página (H2…) vão aparecer aqui automaticamente.</p> : renderList(buildTree(items))}
    </nav>
  );
}

const TableOfContentsInner = {
  label: "Índice",
  fields: {
    title: { type: "text", label: "Título" },
    levels: selectField("Títulos a incluir", LEVELS),
    numbered: switchField("Lista numerada"),
    smoothScroll: switchField("Deslocamento suave"),
    scrollOffset: sliderField("Distância ao topo ao saltar", { min: 0, max: 200, suffix: "px" }),
    titleColor: colorField("Cor do título", { section: "Índice" }),
    linkColor: colorField("Cor dos links", { section: "Índice" }),
    linkHoverColor: colorField("Cor dos links (hover)", { section: "Índice" }),
  },
  defaultProps: {
    title: "Nesta lição",
    levels: "2-3",
    numbered: true,
    smoothScroll: true,
    scrollOffset: 80,
    linkHoverColor: "var(--brand-primary)",
    style: {
      background: "#f8f9fb",
      padding: { desktop: { top: 20, right: 24, bottom: 20, left: 24 } },
      borderRadius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
    },
  },
  render: (props) => <TocView {...props} />,
};

const TableOfContents = withTabs(withStyle(TableOfContentsInner, { typography: true }), {
  containerKeys: ["levels", "numbered", "smoothScroll", "scrollOffset"],
  styleKeys: ["titleColor", "linkColor", "linkHoverColor"],
});

export default TableOfContents;
