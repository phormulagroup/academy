import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, linkField, responsive, selectField } from "../../core/fields";
import { responsiveRules, own } from "../../core/css";
import { linkProps } from "../../core/helpers";

const SIZE_OPTIONS = [
  { value: "xxxl", label: "XXXL · 72px" },
  { value: "xxl", label: "XXL · 56px" },
  { value: "xl", label: "XL · 44px" },
  { value: "l", label: "L · 34px" },
  { value: "m", label: "M · 26px" },
  { value: "s", label: "S · 20px" },
  { value: "xs", label: "XS · 16px" },
];

// "" = <span> (valor antigo); para SEO/acessibilidade o normal é h2/h3.
const LEVEL_OPTIONS = [
  { label: "H1", value: "1" },
  { label: "H2", value: "2" },
  { label: "H3", value: "3" },
  { label: "H4", value: "4" },
  { label: "H5", value: "5" },
  { label: "H6", value: "6" },
  { label: "Parágrafo (p)", value: "p" },
  { label: "Div", value: "div" },
  { label: "Span", value: "" },
];

const HeadingInternal = {
  label: "Título",
  fields: {
    text: { type: "textarea", label: "Texto", contentEditable: true },
    level: selectField("Etiqueta HTML", LEVEL_OPTIONS),
    size: selectField("Tamanho", SIZE_OPTIONS),
    align: responsive(alignField("Alinhamento", { justify: true })),
    link: linkField("Link"),
  },
  defaultProps: {
    align: { desktop: "left" },
    text: "Título",
    size: "m",
    level: "2",
    style: {
      color: "#000000",
      padding: { desktop: { top: 8, bottom: 8 } },
    },
  },
  render: ({ id, align, text, size, level, link, puck }) => {
    const Tag = !level ? "span" : /^\d$/.test(String(level)) ? `h${level}` : level === "p" ? "p" : "div";
    const lp = linkProps(link, puck?.isEditing);
    const css = responsiveRules(`[data-style-id="${id}"] .el-heading`, (d) => ({ textAlign: own(align, d) }));
    return (
      <>
        {css && <style>{css}</style>}
        <Tag className={`el-heading el-heading--${size || "m"}`} style={{ display: "block" }}>
          {lp ? (
            <a className="el-heading-link" {...lp}>
              {text}
            </a>
          ) : (
            text
          )}
        </Tag>
      </>
    );
  },
};

// Tipografia aplica-se ao próprio <hN>, para ganhar ao tamanho predefinido.
const Heading = withTabs(withStyle(HeadingInternal, { typography: true, target: " .el-heading" }));

export default Heading;
