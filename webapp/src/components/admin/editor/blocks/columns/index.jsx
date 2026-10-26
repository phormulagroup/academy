import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { createDropSlot } from "../../components/dropSlot";
import { buttonsField, responsive, selectField, sliderField, switchField } from "../../core/fields";
import { responsiveRules, own, rule } from "../../core/css";
import { boxedFields, boxedDefaultPadding, boxedClassName, boxedCss, fullWidthItemCss } from "../../core/boxed";

// Estruturas pré-definidas (como o "Escolha a sua estrutura" do Elementor).
// Cada coluna é uma zona onde se larga qualquer widget.
export const COLUMN_PRESETS = [
  { label: "1 coluna · 100", value: "100" },
  { label: "2 colunas · 50 / 50", value: "50-50" },
  { label: "2 colunas · 33 / 67", value: "33-67" },
  { label: "2 colunas · 67 / 33", value: "67-33" },
  { label: "2 colunas · 25 / 75", value: "25-75" },
  { label: "2 colunas · 75 / 25", value: "75-25" },
  { label: "3 colunas · 33 / 33 / 33", value: "33-33-33" },
  { label: "3 colunas · 25 / 50 / 25", value: "25-50-25" },
  { label: "3 colunas · 50 / 25 / 25", value: "50-25-25" },
  { label: "3 colunas · 25 / 25 / 50", value: "25-25-50" },
  { label: "4 colunas · 25 × 4", value: "25-25-25-25" },
  { label: "5 colunas · 20 × 5", value: "20-20-20-20-20" },
  { label: "6 colunas · 16 × 6", value: "16-16-16-16-16-16" },
];

const SLOTS = ["col1", "col2", "col3", "col4", "col5", "col6"];
const CONTAINER_KEYS = ["contentWidth", "width", "structure", "gap", "widgetGap", "rowGap", "verticalAlign", "tabletLayout", "mobileLayout", "reverseMobile", "columnPadding"];

function widthsFor(structure) {
  return String(structure || "50-50")
    .split("-")
    .map((n) => Number(n) || 0)
    .slice(0, 6);
}

const ColumnsInternal = {
  label: "Colunas",
  fields: {
    ...boxedFields(false),
    structure: selectField("Estrutura", COLUMN_PRESETS),
    gap: responsive(sliderField("Espaço entre colunas", { min: 0, max: 120, suffix: "px" })),
    widgetGap: sliderField("Espaço entre widgets (dentro de cada coluna)", { min: 0, max: 80, suffix: "px" }),
    rowGap: sliderField("Espaço vertical quando empilhadas", { min: 0, max: 120, suffix: "px" }),
    verticalAlign: buttonsField("Alinhamento vertical", [
      { label: "Topo", value: "flex-start" },
      { label: "Centro", value: "center" },
      { label: "Fundo", value: "flex-end" },
      { label: "Esticar", value: "stretch" },
    ]),
    columnPadding: sliderField("Espaço interno de cada coluna", { min: 0, max: 80, suffix: "px" }),
    tabletLayout: buttonsField("Em tablet", [
      { label: "Manter", value: "keep" },
      { label: "2 por linha", value: "two" },
      { label: "Empilhar", value: "stack" },
    ]),
    mobileLayout: buttonsField("Em mobile", [
      { label: "Empilhar", value: "stack" },
      { label: "2 por linha", value: "two" },
      { label: "Manter", value: "keep" },
    ]),
    reverseMobile: switchField("Inverter a ordem quando empilhadas"),
    ...Object.fromEntries(SLOTS.map((s) => [s, { type: "slot" }])),
  },
  defaultProps: {
    structure: "50-50",
    gap: { desktop: 24 },
    rowGap: 24,
    widgetGap: 16,
    verticalAlign: "flex-start",
    tabletLayout: "keep",
    mobileLayout: "stack",
    ...Object.fromEntries(SLOTS.map((s) => [s, []])),
  },
  render: (props) => {
    const { id, contentWidth, width, structure, gap, widgetGap, rowGap, verticalAlign, tabletLayout, mobileLayout, reverseMobile, columnPadding, puck } = props;
    const isEditing = puck?.isEditing;
    const widths = widthsFor(structure);
    const n = widths.length;
    const row = `.el-cols-${id}`;
    const col = `${row} > .el-col`;

    const layoutCss = (mode, device) => {
      // :nth-child(n) iguala a especificidade das larguras por coluna
      // (:nth-child(1)…) — sem isto as colunas empilhadas mantinham a % do desktop.
      const col = `${row} > .el-col:nth-child(n)`;
      if (mode === "stack") {
        return [
          rule(row, { flexDirection: reverseMobile ? "column-reverse" : "column", rowGap: `${rowGap ?? 24}px` }),
          rule(col, { width: "100%", flex: "1 1 auto" }),
        ].join("");
      }
      if (mode === "two") {
        const g = own(gap, device) ?? own(gap, "desktop") ?? 24;
        return [rule(row, { flexWrap: "wrap", rowGap: `${rowGap ?? 24}px` }), rule(col, { width: `calc(50% - ${g / 2}px)`, flex: "0 0 auto" })].join("");
      }
      return "";
    };

    const css = [
      boxedCss(`[data-style-id="${id}"] > .el-boxed`, contentWidth, width, false),
      fullWidthItemCss(id),
      rule(row, { display: "flex", alignItems: verticalAlign || "flex-start", width: "100%" }),
      ...widths.map((w, i) => rule(`${row} > .el-col:nth-child(${i + 1})`, { width: `${w}%`, flex: `0 1 ${w}%` })),
      rule(col, { display: "flex", flexDirection: "column", minWidth: "0", rowGap: `${widgetGap ?? 16}px`, padding: columnPadding ? `${columnPadding}px` : undefined }),
      responsiveRules(row, (d) => (own(gap, d) !== undefined ? { columnGap: `${own(gap, d)}px` } : {})),
      // As larguras em % somam 100 — com gap, encolhem proporcionalmente
      // (flex-shrink 1) em vez de partir a linha.
      `@media (max-width:1024px){${layoutCss(tabletLayout || "keep", "tablet")}}`,
      `@media (max-width:767px){${layoutCss(mobileLayout || "stack", "mobile")}}`,
    ]
      .filter(Boolean)
      .join("\n");

    return (
      <>
        {/* Fora da linha de colunas — dentro dela, o <style> contava como
            1.º filho para o :nth-child() das larguras. */}
        <style>{css}</style>
        <div className={boxedClassName(contentWidth, false)}>
          <div className={`el-cols-${id}`}>{renderSlots(props, n, isEditing)}</div>
        </div>
      </>
    );
  },
};

function renderSlots(props, n, isEditing) {
  return SLOTS.slice(0, n).map((key, i) => {
    const Slot = props[key];
    if (typeof Slot !== "function") return <div key={key} className="el-col" />;
    return <Slot key={key} as={createDropSlot(isEditing, `Coluna ${i + 1}`)} className="el-col" minEmptyHeight={isEditing ? 80 : undefined} disallow={["Hero", "Stats"]} />;
  });
}

const Columns = withTabs(withStyle(ColumnsInternal, { defaultPadding: boxedDefaultPadding(false) }), { containerKeys: CONTAINER_KEYS });

export default Columns;
