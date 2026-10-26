import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, colorField, responsive, sliderField, switchField } from "../../core/fields";
import { responsiveRules, own } from "../../core/css";

const TextInner = {
  label: "Texto",
  fields: {
    text: { type: "richtext", contentEditable: true, label: "Texto" },
    align: responsive(alignField("Alinhamento", { justify: true })),
    columns: responsive(sliderField("Colunas de texto", { min: 1, max: 4 })),
    columnGap: sliderField("Espaço entre colunas", { min: 0, max: 120, suffix: "px", showIf: (p) => Object.values(p.columns || {}).some((n) => n > 1) }),
    dropCap: switchField("Letra capitular"),
    dropCapColor: colorField("Cor da letra capitular", { showIf: (p) => !!p.dropCap }),
  },
  defaultProps: {
    align: { desktop: "left" },
    text: "<p>Escreva aqui o seu texto. Pode usar <strong>negrito</strong>, listas, links e títulos.</p>",
    style: {
      color: "#000000",
      fontSize: { desktop: { value: 18, unit: "px" } },
    },
  },
  // `size`/`maxWidth` eram campos antigos — continuam a ser respeitados
  // para não mudar o aspeto das lições já guardadas (a Tipografia/Avançado
  // têm prioridade quando estão definidos).
  render: ({ id, align, text, size, maxWidth, columns, columnGap, dropCap, dropCapColor, style }) => {
    const sel = `[data-style-id="${id}"] .el-prose`;
    const css = responsiveRules(sel, (d) => {
      const cols = own(columns, d);
      return {
        textAlign: own(align, d),
        columnCount: cols ? String(cols) : undefined,
        columnGap: cols && cols > 1 ? `${columnGap ?? 32}px` : undefined,
      };
    });
    const legacyStyle = {
      fontSize: !style?.fontSize && size ? `${size}px` : undefined,
      maxWidth: maxWidth || undefined,
      "--el-dropcap-color": dropCapColor || undefined,
    };
    return (
      <>
        {css && <style>{css}</style>}
        <div className={`el-prose${dropCap ? " el-prose--dropcap" : ""}`} style={legacyStyle}>
          {text}
        </div>
      </>
    );
  },
};

const Text = withTabs(withStyle(TextInner, { typography: true }));

export default Text;
