import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, colorField, iconField, responsive, sliderField, switchField, textField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import { legacyAlign } from "../icon";
import ElementIcon from "../../core/icon";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const StatsInner = {
  label: "Estatísticas",
  fields: {
    // Os nomes dos campos (`title` = rótulo, `description` = número) vêm
    // do bloco antigo — mantidos para as páginas já guardadas continuarem
    // iguais sem migração.
    items: {
      type: "array",
      label: "Estatísticas",
      getItemSummary: (item, i) => (item?.title && item?.description ? `${item.description} · ${item.title}` : `Estatística ${(i ?? 0) + 1}`),
      defaultItemProps: {
        description: "100+",
        title: "Rótulo",
      },
      arrayFields: {
        description: { type: "text", label: "Número / valor", contentEditable: true },
        title: { type: "text", label: "Rótulo", contentEditable: true },
        text: textField("Texto adicional (opcional)", { multiline: true, rows: 2 }),
        icon: iconField("Ícone (opcional)"),
      },
    },
    columns: responsive(sliderField("Colunas", { min: 1, max: 6 })),
    gap: responsive(sliderField("Espaço entre itens", { min: 0, max: 120, suffix: "px" })),
    align: responsive(alignField("Alinhamento")),
    dividers: switchField("Linhas divisórias entre itens"),
    dividerColor: colorField("Cor das linhas", { showIf: (p) => !!get(p, "dividers") }),
    numberColor: colorField("Cor do número"),
    numberSize: responsive(unitField("Tamanho do número", { units: ["px", "rem", "vw"], max: 160 })),
    labelColor: colorField("Cor do rótulo"),
    textColor: colorField("Cor do texto adicional"),
    iconColor: colorField("Cor do ícone"),
    iconSize: sliderField("Tamanho do ícone", { min: 12, max: 120, suffix: "px" }),
  },
  defaultProps: {
    items: [
      { description: "1 200+", title: "Alunos formados" },
      { description: "35", title: "Cursos disponíveis" },
      { description: "98%", title: "Taxa de satisfação" },
    ],
    columns: { desktop: 3, tablet: 3, mobile: 1 },
    gap: { desktop: 32 },
    align: { desktop: "center" },
    style: {
      gradient: { enabled: true, from: "var(--brand-primary)", to: "var(--brand-primary-dark)", angle: 120 },
      color: "#ffffff",
      borderRadius: { topLeft: 24, topRight: 24, bottomRight: 24, bottomLeft: 24, unit: "px", linked: true },
      padding: { desktop: { top: 56, right: 24, bottom: 56, left: 24, unit: "px" }, mobile: { top: 40, right: 16, bottom: 40, left: 16, unit: "px" } },
    },
  },
  render: ({ id, items, columns, gap, align, dividers, dividerColor, numberColor, numberSize, labelColor, textColor, iconColor, iconSize, style }) => {
    const list = Array.isArray(items) ? items : [];
    const S = `[data-style-id="${id}"]`;
    const grid = `${S} .el-stats__grid`;
    // Blocos antigos (sem nada no separador Estilo) mantêm o aspeto
    // original: caixa com gradiente, texto branco e 2 colunas em desktop.
    const legacy = style === undefined || style === null;
    const cols = columns ?? { desktop: 2, tablet: 1 };

    const css = [
      responsiveRules(grid, (d) => {
        const c = own(cols, d);
        const g = own(gap, d);
        return {
          gridTemplateColumns: typeof c === "number" ? `repeat(${Math.max(1, Math.min(6, c))}, minmax(0, 1fr))` : undefined,
          gap: dividers ? undefined : typeof g === "number" ? `${g}px` : undefined,
          "--el-stats-pad": dividers && typeof g === "number" ? `${g / 2}px` : undefined,
        };
      }),
      responsiveRules(`${S} .el-stats__item`, (d) => {
        const a = legacyAlign(own(align, d));
        if (!a) return {};
        return { textAlign: a, alignItems: a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center" };
      }),
      dividerColor ? rule(`${S} .el-stats--dividers .el-stats__item`, { borderColor: dividerColor }) : "",
      numberColor ? rule(`${S} .el-stats__value`, { color: `${numberColor} !important` }) : "",
      responsiveRules(`${S} .el-stats__value`, (d) => ({ fontSize: unitToCss(own(numberSize, d)) })),
      labelColor ? rule(`${S} .el-stats__label`, { color: `${labelColor} !important`, opacity: "1" }) : "",
      textColor ? rule(`${S} .el-stats__text`, { color: `${textColor} !important`, opacity: "1" }) : "",
      iconColor ? rule(`${S} .el-stats__icon`, { color: iconColor }) : "",
      typeof iconSize === "number" ? rule(`${S} .el-stats__icon`, { fontSize: `${iconSize}px` }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    return (
      <div className={`el-stats${legacy ? " el-stats--legacy" : ""}${dividers ? " el-stats--dividers" : ""}`}>
        {css && <style>{css}</style>}
        <div className="el-stats__clip">
          <ul className="el-stats__grid">
            {list.map((item, i) => (
              <li key={i} className="el-stats__item">
                {item?.icon && (
                  <span className="el-stats__icon" aria-hidden="true">
                    <ElementIcon name={item.icon} size="1em" />
                  </span>
                )}
                {item?.description && <span className="el-stats__value">{item.description}</span>}
                {item?.title && <span className="el-stats__label">{item.title}</span>}
                {item?.text && <span className="el-stats__text">{item.text}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  },
};

const CONTAINER_KEYS = ["columns", "gap", "align"];
const STYLE_KEYS = ["dividers", "dividerColor", "numberColor", "numberSize", "labelColor", "textColor", "iconColor", "iconSize"];

const Stats = withTabs(withStyle(StatsInner, { typography: true }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default Stats;
