import { useContext, useState } from "react";
import { AutoField } from "@puckeditor/core";
import { ChevronDown } from "lucide-react";
import { DesignPartContext } from "../layout/contexts";

// Agrupa campos consecutivos com a mesma `section` numa secção recolhível
// (Tipografia, Fundo, Borda, …) — como os painéis do Elementor. Campos sem
// `section` ficam soltos no topo.
function groupBySection(entries) {
  const groups = [];
  for (const entry of entries) {
    const section = entry.def.section || null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.items.push(entry);
    else groups.push({ section, items: [entry] });
  }
  return groups;
}

function Section({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`el-section${open ? " el-section--open" : ""}`}>
      <button type="button" className="el-section__head" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <ChevronDown size={14} />
      </button>
      {open && <div className="el-section__body">{children}</div>}
    </div>
  );
}

function DesignPanel({ tabs, value, onChange }) {
  const forced = useContext(DesignPartContext);
  const visibleTabs = tabs.filter((t) => t.parts.some((p) => p.fields && Object.keys(p.fields).length > 0));
  const [tabKey, setTabKey] = useState(visibleTabs[0]?.key);

  const empty = forced && forced !== "container" ? <p className="ed-empty-hint">Este bloco não tem opções nesta secção.</p> : null;
  if (visibleTabs.length === 0) return empty;
  const forcedTab = forced ? tabs.find((t) => t.key === forced) : null;
  if (forced && !visibleTabs.includes(forcedTab)) return empty;
  const active = forcedTab || visibleTabs.find((t) => t.key === tabKey) || visibleTabs[0];

  const entries = [];
  active.parts.forEach((part) => {
    Object.entries(part.fields || {}).forEach(([key, def]) => {
      const storeValue = value?.[part.storage];
      if (typeof def.showIf === "function" && !def.showIf(storeValue || {}, value || {})) return;
      entries.push({ key, def, storage: part.storage });
    });
  });

  const update = (storage, key, v) => onChange({ ...value, [storage]: { ...value?.[storage], [key]: v } });
  const groups = groupBySection(entries);
  let sectionIndex = 0;

  return (
    <div className="editor-design-tabs">
      {!forced && (
      <div className="editor-design-tabs__nav">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`editor-design-tabs__tab${active.key === t.key ? " editor-design-tabs__tab--active" : ""}`}
            onClick={() => setTabKey(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      )}
      <div className="editor-design-tabs__body">
        {groups.map((g, gi) => {
          const content = g.items.map(({ key, def, storage }) => (
            <div key={`${storage}.${key}`} className="el-panel-field">
              <AutoField field={def} value={value?.[storage]?.[key]} onChange={(v) => update(storage, key, v)} />
            </div>
          ));
          if (!g.section) return <div key={`g-${gi}`}>{content}</div>;
          const isFirst = sectionIndex++ === 0;
          return (
            <Section key={`${active.key}-${g.section}-${gi}`} title={g.section} defaultOpen={isFirst}>
              {content}
            </Section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Reorganiza os campos de um bloco em separadores — Layout, Estilo,
 * Avançado — como o painel de edição do Elementor. Os campos de conteúdo
 * que usam a edição direta no canvas do Puck (texto, textarea, richtext)
 * nunca saem do sítio.
 *
 * - `containerKeys`: campos estruturais (direção, colunas, gap…) → "Layout"
 * - `styleKeys`: campos visuais próprios do bloco (cores do botão, do
 *   separador ativo…) → topo do separador "Estilo"
 * Ambos ficam guardados em `__design.container` e chegam ao render como
 * props normais.
 */
export function withTabs(componentConfig, opts = {}) {
  const containerKeys = opts.containerKeys || [];
  const styleKeys = opts.styleKeys || [];
  const movedKeys = [...containerKeys, ...styleKeys];

  const pick = (fields, keys) => {
    const picked = {};
    keys.forEach((k) => {
      if (fields[k]) picked[k] = fields[k];
    });
    return picked;
  };

  // eslint-disable-next-line no-unused-vars
  const { style: staticStyleField, layout: staticLayoutField, ...staticRest } = componentConfig.fields || {};

  if (!staticStyleField && !staticLayoutField && movedKeys.length === 0) {
    return componentConfig;
  }

  const { style: styleDefault, layout: layoutDefault, ...restDefaults } = componentConfig.defaultProps || {};
  const containerDefaults = {};
  movedKeys.forEach((k) => {
    if (restDefaults[k] !== undefined) {
      containerDefaults[k] = restDefaults[k];
      delete restDefaults[k];
    }
  });

  const buildFields = (resolvedFields) => {
    const { style: styleFieldDef, layout: layoutFieldDef, ...rest } = resolvedFields;
    const contentFields = { ...rest };
    movedKeys.forEach((k) => delete contentFields[k]);

    return {
      ...contentFields,
      __design: {
        type: "custom",
        label: "Estilo e disposição",
        render: ({ value, onChange }) => (
          <DesignPanel
            tabs={[
              { key: "container", label: "Disposição", parts: [{ storage: "container", fields: pick(rest, containerKeys) }] },
              {
                key: "style",
                label: "Estilo",
                parts: [
                  { storage: "container", fields: pick(rest, styleKeys) },
                  { storage: "style", fields: (styleFieldDef ?? staticStyleField)?.objectFields || {} },
                ],
              },
              { key: "layout", label: "Avançado", parts: [{ storage: "layout", fields: (layoutFieldDef ?? staticLayoutField)?.objectFields || {} }] },
            ]}
            value={value}
            onChange={onChange}
          />
        ),
      },
    };
  };

  return {
    ...componentConfig,
    fields: buildFields(componentConfig.fields || {}),
    defaultProps: {
      ...restDefaults,
      __design: { container: containerDefaults, style: styleDefault, layout: layoutDefault },
    },
    resolveFields: componentConfig.resolveFields
      ? async (data, params) => {
          const resolved = await componentConfig.resolveFields(data, params);
          return buildFields(resolved || {});
        }
      : undefined,
    render: (props) => {
      const { __design, ...rest } = props;
      return componentConfig.render({
        ...rest,
        ...__design?.container,
        style: __design?.style,
        layout: __design?.layout,
      });
    },
  };
}
