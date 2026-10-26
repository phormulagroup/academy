import { Children, useContext, useState } from "react";
import { Drawer, Puck, useGetPuck, usePuck } from "@puckeditor/core";
import { Input, Tooltip } from "antd";
import { ArrowLeft, ChevronDown, ChevronRight, Copy, LayoutGrid, ListTree, Search, Settings, Trash2 } from "lucide-react";

import { config } from "../config";
import ElementIcon from "../core/icon";
import { ROOT_ZONE, blockIcon, blockLabel } from "./blocks";
import { DesignPartContext, TabContext } from "./contexts";


// --------------------------------------------------------------------------
// Blocos: paleta por categorias, em mosaicos com ícone, com pesquisa
// --------------------------------------------------------------------------

function Tile({ name }) {
  return (
    <Drawer.Item name={name} label={blockLabel(name)}>
      {() => (
        <div className="ed-tile" title={blockLabel(name)}>
          <ElementIcon name={blockIcon(name)} size={22} strokeWidth={1.5} />
          <span>{blockLabel(name)}</span>
        </div>
      )}
    </Drawer.Item>
  );
}

function Category({ title, names, open, onToggle }) {
  return (
    <section className="ed-cat">
      <button type="button" className="ed-cat__head" onClick={onToggle} aria-expanded={open}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
      </button>
      {/* Esconde-se por CSS (não se desmonta) para o arrastar manter os mosaicos registados. */}
      <div className="ed-cat__body" hidden={!open}>
        <Drawer>
          {names.map((n) => (
            <Tile key={n} name={n} />
          ))}
        </Drawer>
      </div>
    </section>
  );
}

function Palette() {
  const [search, setSearch] = useState("");
  const [closed, setClosed] = useState({});
  const term = search.trim().toLowerCase();
  const categories = Object.entries(config.categories || {});
  const listed = new Set(categories.flatMap(([, c]) => c.components));
  const others = Object.keys(config.components).filter((n) => !listed.has(n));
  const groups = [...categories.map(([key, c]) => ({ key, title: c.title, names: c.components })), ...(others.length ? [{ key: "other", title: "Outros", names: others }] : [])]
    .map((g) => ({ ...g, names: term ? g.names.filter((n) => `${blockLabel(n)} ${n}`.toLowerCase().includes(term)) : g.names }))
    .filter((g) => g.names.length);

  return (
    <div className="ed-palette">
      <div className="ed-search">
        <Input allowClear prefix={<Search size={14} />} placeholder="Pesquisar bloco…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="ed-scroll">
        {groups.length === 0 && <p className="ed-empty-hint">Nenhum bloco encontrado para “{search}”.</p>}
        {groups.map((g) => (
          <Category key={g.key} title={g.title} names={g.names} open={term ? true : !closed[g.key]} onToggle={() => setClosed((c) => ({ ...c, [g.key]: !c[g.key] }))} />
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Estrutura: árvore de camadas (a do Puck só tem texto em inglês)
// --------------------------------------------------------------------------

const isBlock = (v) => v && typeof v === "object" && typeof v.type === "string" && v.props && typeof v.props === "object";

// Zonas (slots) de um bloco: arrays de blocos em qualquer sítio das props,
// incluindo dentro de listas de objetos (separadores, acordeão...).
function slotsOf(value, path = "", out = []) {
  if (Array.isArray(value)) {
    if (value.length && value.every(isBlock)) out.push({ path, items: value });
    else value.forEach((v, i) => slotsOf(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) => slotsOf(v, path ? `${path}.${k}` : k, out));
  }
  return out;
}

function Layer({ item, depth, selectedId, collapsed, setCollapsed }) {
  // useGetPuck (em vez de usePuck) para as camadas não voltarem a desenhar-se a cada alteração.
  const getPuck = useGetPuck();
  const dispatch = (action) => getPuck().dispatch(action);
  const getSelectorForId = (id) => getPuck().getSelectorForId(id);
  const id = item.props.id;
  const slots = slotsOf(item.props);
  const isOpen = !collapsed[id];
  const selected = selectedId === id;
  const act = (fn) => (e) => {
    e.stopPropagation();
    const sel = getSelectorForId(id);
    if (sel) fn(sel);
  };

  return (
    <li>
      <div
        className={`ed-layer${selected ? " ed-layer--selected" : ""}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => {
          const sel = getSelectorForId(id);
          if (sel) dispatch({ type: "setUi", ui: { itemSelector: { index: sel.index, zone: sel.zone } } });
        }}
      >
        <button
          type="button"
          className="ed-layer__chev"
          aria-label={isOpen ? "Recolher" : "Expandir"}
          style={{ visibility: slots.length ? "visible" : "hidden" }}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((c) => ({ ...c, [id]: !c[id] }));
          }}
        >
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <ElementIcon name={blockIcon(item.type)} size={15} />
        <span className="ed-layer__name">{blockLabel(item.type)}</span>
        <span className="ed-layer__actions">
          <Tooltip title="Duplicar">
            <button type="button" aria-label="Duplicar" onClick={act((sel) => dispatch({ type: "duplicate", sourceIndex: sel.index, sourceZone: sel.zone }))}>
              <Copy size={13} />
            </button>
          </Tooltip>
          <Tooltip title="Eliminar">
            <button type="button" aria-label="Eliminar" onClick={act((sel) => dispatch({ type: "remove", index: sel.index, zone: sel.zone }))}>
              <Trash2 size={13} />
            </button>
          </Tooltip>
        </span>
      </div>
      {isOpen &&
        slots.map((slot) => (
          <Layers key={slot.path} items={slot.items} depth={depth + 1} selectedId={selectedId} collapsed={collapsed} setCollapsed={setCollapsed} title={slots.length > 1 ? slot.path : null} />
        ))}
    </li>
  );
}

function Layers({ items, depth, selectedId, collapsed, setCollapsed, title }) {
  return (
    <>
      {title && (
        <div className="ed-layer-zone" style={{ paddingLeft: 24 + depth * 14 }}>
          {title.replace(/^col(\d+)$/, "coluna $1")}
        </div>
      )}
      <ul className="ed-layers">
        {items.map((item) => (
          <Layer key={item.props.id} item={item} depth={depth} selectedId={selectedId} collapsed={collapsed} setCollapsed={setCollapsed} />
        ))}
      </ul>
    </>
  );
}

function Navigator() {
  const { appState, selectedItem } = usePuck();
  const [collapsed, setCollapsed] = useState({});
  const empty = !appState.data.content?.length;
  return (
    <div className="ed-scroll ed-navigator">
      {empty ? (
        <p className="ed-empty-hint">A página ainda não tem blocos. Arraste um bloco do separador “Blocos” para a página.</p>
      ) : (
        <Layers items={appState.data.content} depth={0} selectedId={selectedItem?.props?.id} collapsed={collapsed} setCollapsed={setCollapsed} />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Propriedades do bloco (ou da página): Conteúdo / Estilo / Avançado
// --------------------------------------------------------------------------

// Wrapper dos campos (overrides.fields): reparte os campos do Puck pelo
// separador ativo. `__design` (ver withTabs) é desenhado em partes: a
// disposição junto ao conteúdo, o estilo e o avançado nos outros separadores.
export function FieldsOverride({ children, isLoading, itemSelector }) {
  const tab = useContext(TabContext);
  const items = Children.toArray(children);
  const keyOf = (el) => String(el.key ?? "").replace(/^\.\$/, "");
  const design = items.find((el) => keyOf(el) === "__design");
  const rest = items.filter((el) => keyOf(el) !== "__design");

  if (!itemSelector) {
    // Definições da página: Geral / SEO
    const seo = rest.filter((el) => keyOf(el).startsWith("seo_"));
    return <div className={isLoading ? "ed-fields ed-fields--loading" : "ed-fields"}>{tab === "style" ? seo : rest.filter((el) => !seo.includes(el))}</div>;
  }
  const part = { style: "style", advanced: "layout", content: "container" }[tab];
  return (
    <div className={isLoading ? "ed-fields ed-fields--loading" : "ed-fields"}>
      {tab === "content" && rest}
      {design && <DesignPartContext.Provider value={part}>{design}</DesignPartContext.Provider>}
    </div>
  );
}

function Properties({ onBack, backLabel }) {
  const { selectedItem, appState, dispatch } = usePuck();
  const isRoot = !appState.ui.itemSelector;
  const type = selectedItem?.type;
  const hasDesign = !isRoot && !!config.components[type]?.fields?.__design;
  const [tab, setTab] = useState("content");

  const tabs = isRoot
    ? [
        ["content", "Geral"],
        ["style", "SEO"],
      ]
    : hasDesign
      ? [
          ["content", "Conteúdo"],
          ["style", "Estilo"],
          ["advanced", "Avançado"],
        ]
      : [["content", "Conteúdo"]];
  const showSeo = !isRoot || !!appState.data.root?.props?.seoEnabled;

  return (
    <div className="ed-props">
      <div className="ed-props__head">
        <button type="button" className="ed-back" onClick={onBack}>
          <ArrowLeft size={15} /> {backLabel}
        </button>
        <div className="ed-props__title">
          <span className="ed-props__icon">{isRoot ? <Settings size={18} /> : <ElementIcon name={blockIcon(type)} size={18} />}</span>
          <strong>{isRoot ? "Definições da página" : blockLabel(type)}</strong>
          {!isRoot && (
            <Tooltip title="Duplicar bloco">
              <button
                type="button"
                className="ed-iconbtn"
                aria-label="Duplicar bloco"
                onClick={() => {
                  const sel = appState.ui.itemSelector;
                  dispatch({ type: "duplicate", sourceIndex: sel.index, sourceZone: sel.zone || ROOT_ZONE });
                }}
              >
                <Copy size={14} />
              </button>
            </Tooltip>
          )}
        </div>
        {(tabs.length > 1 && (!isRoot || showSeo)) && (
          <div className="ed-tabs ed-tabs--underline" role="tablist">
            {tabs.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ed-scroll">
        <TabContext.Provider value={tab}>
          <Puck.Fields />
        </TabContext.Provider>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Barra lateral: lista (Blocos | Estrutura) ou propriedades da seleção
// --------------------------------------------------------------------------

export default function Sidebar() {
  const { appState, dispatch } = usePuck();
  const selected = appState.ui.itemSelector;
  const [list, setList] = useState("blocks"); // blocks | outline
  const [pageSettings, setPageSettings] = useState(false);

  // Escolher um bloco fecha as definições da página (ajuste durante o render,
  // sem useEffect).
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    if (selected) setPageSettings(false);
  }

  const back = () => {
    setPageSettings(false);
    dispatch({ type: "setUi", ui: { itemSelector: null } });
  };

  if (selected || pageSettings) return <Properties key={selected ? `${selected.zone}:${selected.index}` : "page"} onBack={back} backLabel={list === "outline" ? "Estrutura" : "Blocos"} />;

  return (
    <div className="ed-list">
      <div className="ed-list__head">
        <div className="ed-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={list === "blocks"} className={list === "blocks" ? "is-active" : ""} onClick={() => setList("blocks")}>
            <LayoutGrid size={15} />
            Blocos
          </button>
          <button type="button" role="tab" aria-selected={list === "outline"} className={list === "outline" ? "is-active" : ""} onClick={() => setList("outline")}>
            <ListTree size={15} />
            Estrutura
          </button>
        </div>
        <Tooltip title="Definições da página (SEO, espaçamento, fundo)">
          <button type="button" className="ed-iconbtn ed-iconbtn--lg" aria-label="Definições da página" onClick={() => setPageSettings(true)}>
            <Settings size={17} />
          </button>
        </Tooltip>
      </div>
      <div className="ed-list__body">{list === "blocks" ? <Palette /> : <Navigator />}</div>
    </div>
  );
}
