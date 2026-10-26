import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { createDropSlot } from "../../components/dropSlot";
import { buttonsField, responsive, sliderField, textField } from "../../core/fields";
import { responsiveRules, own, resolveForDevice, rule } from "../../core/css";
import { boxedFields, boxedDefaultPadding, boxedClassName, boxedCss, fullWidthItemCss } from "../../core/boxed";

const CONTAINER_KEYS = ["contentWidth", "width", "numColumns", "template", "gapX", "gapY", "alignItems"];

const GridInternal = {
  label: "Grelha",
  fields: {
    // Por omissão a toda a largura (uma grelha costuma estar dentro de um
    // Contentor, que já é "em caixa").
    ...boxedFields(false),
    numColumns: responsive(sliderField("Colunas", { min: 1, max: 12 })),
    template: responsive(
      textField("Larguras personalizadas", {
        placeholder: "ex.: 2fr 1fr  ou  300px 1fr",
        help: "Opcional — substitui o número de colunas neste dispositivo.",
      }),
    ),
    gapX: responsive(sliderField("Espaço entre colunas", { min: 0, max: 120, suffix: "px" })),
    gapY: responsive(sliderField("Espaço entre linhas", { min: 0, max: 120, suffix: "px" })),
    alignItems: responsive(
      buttonsField("Alinhamento vertical", [
        { label: "Esticar", value: "stretch" },
        { label: "Topo", value: "start" },
        { label: "Centro", value: "center" },
        { label: "Fundo", value: "end" },
      ]),
    ),
    items: { type: "slot" },
  },
  defaultProps: {
    numColumns: { desktop: 3, tablet: 2, mobile: 1 },
    gapX: { desktop: 24 },
    gapY: { desktop: 24 },
    items: [],
  },
  // Formato antigo: numColumns/gap eram números simples (só desktop; abaixo
  // de 768px passava sempre a 1 coluna) — mantém-se esse comportamento
  // quando tablet/mobile não estão definidos.
  render: ({ id, contentWidth, width, numColumns, template, gapX, gapY, gap, alignItems, items: Items, puck }) => {
    const isEditing = puck?.isEditing;
    const slot = `.el-grid-${id}`;
    const legacyNumber = typeof numColumns === "number";
    const cols = (d) => {
      const n = own(numColumns, d);
      if (n !== undefined) return n;
      if (legacyNumber && d === "mobile") return 1;
      return undefined;
    };
    const css = [
      boxedCss(`[data-style-id="${id}"] > .el-boxed`, contentWidth, width, false),
      fullWidthItemCss(id),
      rule(slot, { display: "grid", gridTemplateColumns: "repeat(1, minmax(0, 1fr))" }),
      responsiveRules(slot, (d) => {
        const t = own(template, d);
        const n = cols(d);
        return {
          gridTemplateColumns: t ? String(t).replace(/[;{}]/g, "") : n ? `repeat(${Math.min(Math.max(Number(n), 1), 12)}, minmax(0, 1fr))` : undefined,
          columnGap: own(gapX, d) !== undefined ? `${own(gapX, d)}px` : d === "desktop" && typeof gap === "number" ? `${gap}px` : undefined,
          rowGap: own(gapY, d) !== undefined ? `${own(gapY, d)}px` : d === "desktop" && typeof gap === "number" ? `${gap}px` : undefined,
          alignItems: own(alignItems, d),
        };
      }),
    ].join("\n");

    const desktopCols = Number(resolveForDevice(numColumns, "desktop")) || 1;

    return (
      <div className={boxedClassName(contentWidth, false)} style={{ position: "relative" }}>
        <style>{css}</style>
        {isEditing && (
          <div className={`el-grid-${id}`} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {Array.from({ length: Math.min(desktopCols, 12) }).map((_, i) => (
              <div key={i} style={{ border: "1px dashed var(--puck-color-azure-06, #6b7bff)", borderRadius: 4, opacity: 0.5 }} />
            ))}
          </div>
        )}
        <Items as={createDropSlot(isEditing)} disallow={["Hero", "Stats"]} className={`el-grid-${id}`} minEmptyHeight={isEditing ? 96 : undefined} style={{ position: "relative" }} />
      </div>
    );
  },
};

const Grid = withTabs(withStyle(GridInternal, { defaultPadding: boxedDefaultPadding(false) }), { containerKeys: CONTAINER_KEYS });

export default Grid;
