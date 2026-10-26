import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { createDropSlot } from "../../components/dropSlot";
import { buttonsField, colorField, responsive, selectField, sliderField, switchField, unitField, headingField } from "../../core/fields";
import { responsiveRules, own, unitToCss, rule } from "../../core/css";
import { ShapeDivider, SHAPE_OPTIONS } from "../../core/shapes";
import { boxedFields, boxedClassName, boxedCss, fullWidthItemCss } from "../../core/boxed";
import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalSpaceBetween,
  AlignHorizontalSpaceAround,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  StretchVertical,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
} from "lucide-react";

const CONTAINER_KEYS = ["contentWidth", "width", "minHeight", "direction", "justifyContent", "alignItems", "gapX", "gapY", "wrap", "htmlTag", "overflow"];
const STYLE_KEYS = ["shapeHeading", "shapeTop", "shapeTopColor", "shapeTopHeight", "shapeTopFlip", "shapeBottom", "shapeBottomColor", "shapeBottomHeight", "shapeBottomFlip"];

const FlexInternal = {
  label: "Contentor",
  fields: {
    ...boxedFields(true),
    minHeight: responsive(unitField("Altura mínima", { units: ["px", "vh"], maxByUnit: { px: 1200, vh: 100 } })),
    direction: responsive(
      buttonsField("Direção", [
        { label: <ArrowRight size={14} />, value: "row", title: "Linha" },
        { label: <ArrowDown size={14} />, value: "column", title: "Coluna" },
        { label: <ArrowLeft size={14} />, value: "row-reverse", title: "Linha invertida" },
        { label: <ArrowUp size={14} />, value: "column-reverse", title: "Coluna invertida" },
      ]),
    ),
    justifyContent: responsive(
      buttonsField("Justificar conteúdo", [
        { label: <AlignHorizontalJustifyStart size={14} />, value: "flex-start", title: "Início" },
        { label: <AlignHorizontalJustifyCenter size={14} />, value: "center", title: "Centro" },
        { label: <AlignHorizontalJustifyEnd size={14} />, value: "flex-end", title: "Fim" },
        { label: <AlignHorizontalSpaceBetween size={14} />, value: "space-between", title: "Espaço entre" },
        { label: <AlignHorizontalSpaceAround size={14} />, value: "space-around", title: "Espaço à volta" },
      ]),
    ),
    alignItems: responsive(
      buttonsField("Alinhar itens", [
        { label: <AlignStartVertical size={14} />, value: "flex-start", title: "Início" },
        { label: <AlignCenterVertical size={14} />, value: "center", title: "Centro" },
        { label: <AlignEndVertical size={14} />, value: "flex-end", title: "Fim" },
        { label: <StretchVertical size={14} />, value: "stretch", title: "Esticar" },
      ]),
    ),
    gapX: responsive(sliderField("Espaço entre colunas", { min: 0, max: 120, suffix: "px" })),
    gapY: responsive(sliderField("Espaço entre linhas", { min: 0, max: 120, suffix: "px" })),
    wrap: responsive(
      buttonsField("Quebra de linha", [
        { label: "Com quebra", value: "wrap" },
        { label: "Sem quebra", value: "nowrap" },
      ]),
    ),
    htmlTag: selectField("Etiqueta HTML", [
      { label: "div", value: "div" },
      { label: "section", value: "section" },
      { label: "header", value: "header" },
      { label: "footer", value: "footer" },
      { label: "article", value: "article" },
      { label: "aside", value: "aside" },
    ]),
    overflow: buttonsField("Conteúdo a mais", [
      { label: "Mostrar", value: "" },
      { label: "Esconder", value: "hidden" },
    ]),

    shapeHeading: headingField("Separador de forma"),
    shapeTop: selectField("Forma no topo", SHAPE_OPTIONS),
    shapeTopColor: colorField("Cor (topo)", { showIf: (c) => !!c.shapeTop }),
    shapeTopHeight: sliderField("Altura (topo)", { min: 10, max: 300, suffix: "px", showIf: (c) => !!c.shapeTop }),
    shapeTopFlip: switchField("Inverter (topo)", { showIf: (c) => !!c.shapeTop }),
    shapeBottom: selectField("Forma no fundo", SHAPE_OPTIONS),
    shapeBottomColor: colorField("Cor (fundo)", { showIf: (c) => !!c.shapeBottom }),
    shapeBottomHeight: sliderField("Altura (fundo)", { min: 10, max: 300, suffix: "px", showIf: (c) => !!c.shapeBottom }),
    shapeBottomFlip: switchField("Inverter (fundo)", { showIf: (c) => !!c.shapeBottom }),

    items: { type: "slot" },
  },
  defaultProps: {
    contentWidth: "boxed",
    direction: { desktop: "column" },
    gapX: { desktop: 20 },
    gapY: { desktop: 20 },
    wrap: { desktop: "nowrap" },
    htmlTag: "div",
    items: [],
  },
  render: (props) => {
    const {
      id,
      contentWidth,
      width,
      minHeight,
      justifyContent,
      alignItems,
      direction,
      gapX,
      gapY,
      gap,
      wrap,
      overflow,
      htmlTag,
      items: Items,
      puck,
    } = props;
    const isEditing = puck?.isEditing;
    const S = `[data-style-id="${id}"]`;
    const inner = `${S} > .el-container > .el-container__inner`;
    const slot = `.el-flex-${id}`;
    // `gap` = formato antigo ({column,row,linked} único); justify/align
    // antigos vinham como "start"/"end" (também válidos em flexbox).
    const legacyCol = gap?.column;
    const legacyRow = gap?.linked === false ? gap?.row : gap?.column;
    const hasShapes = props.shapeTop || props.shapeBottom;

    const css = [
      rule(slot, { display: "flex", flexDirection: "column" }),
      boxedCss(inner, contentWidth, width, true),
      fullWidthItemCss(id),
      responsiveRules(slot, (d) => ({
        flexDirection: own(direction, d),
        justifyContent: own(justifyContent, d),
        alignItems: own(alignItems, d),
        flexWrap: own(wrap, d) ?? (d === "desktop" && typeof wrap === "string" ? wrap : undefined),
        columnGap: own(gapX, d) !== undefined ? `${own(gapX, d)}px` : d === "desktop" && legacyCol !== undefined ? `${legacyCol}px` : undefined,
        rowGap: own(gapY, d) !== undefined ? `${own(gapY, d)}px` : d === "desktop" && legacyRow !== undefined ? `${legacyRow}px` : undefined,
      })),
      responsiveRules(`${S} > .el-container`, (d) => ({ minHeight: unitToCss(own(minHeight, d)) })),
      overflow ? rule(S, { overflow }) : "",
      hasShapes ? rule(S, { position: "relative" }) : "",
      hasShapes ? rule(`${S} > .el-container`, { position: "relative", zIndex: "1" }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const Tag = ["section", "header", "footer", "article", "aside"].includes(htmlTag) ? htmlTag : "div";

    return (
      <>
        <style>{css}</style>
        {props.shapeTop && <ShapeDivider position="top" shape={props.shapeTop} color={props.shapeTopColor} height={props.shapeTopHeight || 60} flip={props.shapeTopFlip} />}
        <Tag className="el-container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
          <div className={`el-container__inner ${boxedClassName(contentWidth, true)}`}>
            <Items
              as={createDropSlot(isEditing)}
              className={`el-flex-${id}`}
              minEmptyHeight={isEditing ? 80 : undefined}
              style={{ minHeight: isEditing ? 80 : undefined }}
              disallow={["Hero", "Stats"]}
            />
          </div>
        </Tag>
        {props.shapeBottom && <ShapeDivider position="bottom" shape={props.shapeBottom} color={props.shapeBottomColor} height={props.shapeBottomHeight || 60} flip={props.shapeBottomFlip} />}
      </>
    );
  },
};

const Flex = withTabs(withStyle(FlexInternal, { defaultPadding: () => ({ top: 20, right: 0, bottom: 20, left: 0, unit: "px" }) }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default Flex;
