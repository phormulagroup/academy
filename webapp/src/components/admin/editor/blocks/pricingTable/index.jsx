import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { alignField, buttonsField, colorField, linkField, selectField, switchField, textField } from "../../core/fields";
import { rule } from "../../core/css";
import ElementIcon from "../../core/icon";
import { ElButton, BUTTON_SIZES, BUTTON_VARIANTS } from "../button";
import "./styles.css";

const get = (p, k) => p?.[k] ?? p?.__design?.container?.[k];

const SR = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

function Price({ currency, position, value, className }) {
  if (!value && value !== 0) return null;
  const cur = currency ? <span className="el-pricing__currency">{currency}</span> : null;
  return (
    <span className={className}>
      {position !== "after" && cur}
      <span className="el-pricing__amount">{value}</span>
      {position === "after" && cur}
    </span>
  );
}

const PricingTableInner = {
  label: "Tabela de preços",
  fields: {
    title: { type: "text", label: "Título", contentEditable: true },
    subtitle: { type: "textarea", label: "Subtítulo", contentEditable: true },
    currency: textField("Moeda", { placeholder: "€" }),
    currencyPosition: buttonsField("Posição da moeda", [
      { label: "Antes (€49)", value: "before" },
      { label: "Depois (49 €)", value: "after" },
    ]),
    price: textField("Preço", { placeholder: "ex.: 49 ou 49,90" }),
    originalPrice: textField("Preço original (riscado)", { placeholder: "opcional" }),
    period: textField("Período", { placeholder: "ex.: /mês ou pagamento único" }),
    features: {
      type: "array",
      label: "Características",
      getItemSummary: (item, i) => `${item?.included === false ? "✕" : "✓"} ${item?.text || `Item ${(i ?? 0) + 1}`}`,
      defaultItemProps: { text: "Característica", included: true },
      arrayFields: {
        text: textField("Texto"),
        included: switchField("Incluído"),
      },
    },
    buttonLabel: textField("Texto do botão"),
    buttonLink: linkField("Link do botão"),
    buttonVariant: selectField("Estilo do botão", BUTTON_VARIANTS),
    buttonSize: buttonsField("Tamanho do botão", BUTTON_SIZES),
    footnote: textField("Nota por baixo do botão", { placeholder: "ex.: IVA incluído" }),
    badgeText: textField("Destaque", { placeholder: "ex.: Mais popular" }),
    ribbon: switchField("Destaque em fita no canto", { showIf: (p) => !!get(p, "badgeText") }),
    highlighted: switchField("Realçar este plano"),

    align: alignField("Alinhamento"),

    accentColor: colorField("Cor de destaque"),
    priceColor: colorField("Cor do preço"),
    featureColor: colorField("Cor das características"),
    checkColor: colorField("Cor do ícone incluído"),
    crossColor: colorField("Cor do ícone não incluído"),
    badgeTextColor: colorField("Cor do texto do destaque"),
  },
  defaultProps: {
    title: "Plano completo",
    subtitle: "Acesso a todos os módulos do curso",
    currency: "€",
    currencyPosition: "after",
    price: "149",
    originalPrice: "199",
    period: "pagamento único",
    features: [
      { text: "Todos os módulos e testes", included: true },
      { text: "Certificado de conclusão", included: true },
      { text: "Acesso durante 12 meses", included: true },
      { text: "Sessões de tutoria", included: false },
    ],
    buttonLabel: "Inscrever-me",
    buttonLink: { url: "#" },
    buttonVariant: "primary",
    buttonSize: "md", // = altura dos botões do tema
    badgeText: "Mais popular",
    ribbon: false,
    highlighted: true,
    align: "center",
    style: {
      background: "#ffffff",
      borderRadius: { topLeft: 16, topRight: 16, bottomRight: 16, bottomLeft: 16, unit: "px", linked: true },
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      padding: { desktop: { top: 32, right: 28, bottom: 32, left: 28, unit: "px" }, mobile: { top: 24, right: 20, bottom: 24, left: 20, unit: "px" } },
    },
  },
  render: ({
    id,
    title,
    subtitle,
    currency,
    currencyPosition,
    price,
    originalPrice,
    period,
    features,
    buttonLabel,
    buttonLink,
    buttonVariant,
    buttonSize,
    footnote,
    badgeText,
    ribbon,
    highlighted,
    align,
    accentColor,
    priceColor,
    featureColor,
    checkColor,
    crossColor,
    badgeTextColor,
    puck,
  }) => {
    const list = Array.isArray(features) ? features : [];
    const S = `[data-style-id="${id}"]`;
    const box = `${S} .el-pricing`;
    const a = ["left", "center", "right"].includes(align) ? align : "center";
    const css = [
      accentColor ? rule(box, { "--el-pricing-accent": accentColor }) : "",
      priceColor ? rule(`${box} .el-pricing__price`, { color: `${priceColor} !important` }) : "",
      featureColor ? rule(`${box} .el-pricing__feature`, { color: `${featureColor} !important` }) : "",
      checkColor ? rule(`${box} .el-pricing__check`, { color: checkColor }) : "",
      crossColor ? rule(`${box} .el-pricing__cross`, { color: crossColor }) : "",
      badgeTextColor ? rule(`${box} :is(.el-pricing__badge, .el-pricing__ribbon)`, { color: `${badgeTextColor} !important` }) : "",
    ]
      .filter(Boolean)
      .join("\n");

    const hasOriginal = !!originalPrice && String(originalPrice).trim() !== "";
    const pos = currencyPosition === "after" ? "after" : "before";

    return (
      <div className={`el-pricing el-pricing--${a}${highlighted ? " el-pricing--highlighted" : ""}${badgeText && ribbon ? " el-pricing--has-ribbon" : ""}`}>
        {css && <style>{css}</style>}
        {badgeText && ribbon && (
          <div className="el-pricing__ribbon">
            <span>{badgeText}</span>
          </div>
        )}
        {badgeText && !ribbon && <div className="el-pricing__badge">{badgeText}</div>}

        <div className="el-pricing__header">
          {title && <h3 className="el-pricing__title">{title}</h3>}
          {subtitle && <div className="el-pricing__subtitle">{subtitle}</div>}
        </div>

        <div className="el-pricing__prices">
          {hasOriginal && (
            <span className="el-pricing__original">
              <span style={SR}>Preço anterior: </span>
              <del>
                <Price currency={currency} position={pos} value={originalPrice} />
              </del>
            </span>
          )}
          <span className="el-pricing__price">
            {hasOriginal && <span style={SR}>Preço atual: </span>}
            <Price currency={currency} position={pos} value={price} />
          </span>
          {period && <span className="el-pricing__period">{period}</span>}
        </div>

        {list.length > 0 && (
          <ul className="el-pricing__features">
            {list.map((f, i) => {
              const included = f?.included !== false;
              return (
                <li key={i} className={`el-pricing__feature${included ? "" : " el-pricing__feature--excluded"}`}>
                  <span className={included ? "el-pricing__check" : "el-pricing__cross"} aria-hidden="true">
                    <ElementIcon name={included ? "check" : "x"} size="1.1em" strokeWidth={2.5} />
                  </span>
                  <span>
                    {f?.text}
                    {!included && <span style={SR}> (não incluído)</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {buttonLabel && (
          <div className="el-pricing__action">
            <ElButton label={buttonLabel} link={buttonLink} variant={buttonVariant || "primary"} size={buttonSize || "lg"} isEditing={puck?.isEditing} className="el-pricing__button" />
          </div>
        )}
        {footnote && <div className="el-pricing__footnote">{footnote}</div>}
      </div>
    );
  },
};

const STYLE_KEYS = ["accentColor", "priceColor", "featureColor", "checkColor", "crossColor", "badgeTextColor"];

// Estilo (fundo, borda, sombra, padding…) aplica-se ao próprio cartão.
const PricingTable = withTabs(withStyle(PricingTableInner, { typography: true, target: " .el-pricing" }), { containerKeys: ["align"], styleKeys: STYLE_KEYS });

export default PricingTable;
