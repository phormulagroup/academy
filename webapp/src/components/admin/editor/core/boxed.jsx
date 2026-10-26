import { buttonsField, responsive, unitField } from "./fields";
import { responsiveRules, own, unitToCss, rule } from "./css";

// "Largura do conteúdo" partilhada por Contentor, Grelha e Colunas:
//  - "full": sem largura máxima nenhuma;
//  - "boxed": a mesma caixa do resto do site (classe .site-container de
//    site.css — largura máxima e margens laterais iguais às do cabeçalho,
//    rodapé e secções), centrada. "Largura da caixa" substitui esse máximo
//    (com !important). A margem lateral vem do .site-container, por isso o
//    espaçamento interno por omissão do bloco passa a ser só vertical
//    (boxedDefaultPadding).
export function boxedFields(defaultBoxed = true) {
  return {
    contentWidth: buttonsField("Largura do conteúdo", [
      { label: "Em caixa", value: "boxed" },
      { label: "Largura total", value: "full" },
    ]),
    width: responsive(
      unitField("Largura da caixa", {
        units: ["px", "%", "vw"],
        help: "Vazio = a largura normal do site.",
        showIf: (c) => (c.contentWidth || (defaultBoxed ? "boxed" : "full")) !== "full",
      }),
    ),
  };
}

export function isBoxed(contentWidth, defaultBoxed = true) {
  return (contentWidth || (defaultBoxed ? "boxed" : "full")) !== "full";
}

export function boxedClassName(contentWidth, defaultBoxed = true) {
  return isBoxed(contentWidth, defaultBoxed) ? "el-boxed site-container" : "el-boxed";
}

export function boxedCss(selector, contentWidth, width, defaultBoxed = true) {
  const base = rule(selector, { width: "100%", marginLeft: "auto", marginRight: "auto" });
  if (!isBoxed(contentWidth, defaultBoxed)) return [base, rule(selector, { maxWidth: "none" })].join("\n");
  return [
    base,
    responsiveRules(selector, (d) => {
      const w = unitToCss(own(width, d));
      return w ? { maxWidth: `${w} !important` } : {};
    }),
  ].join("\n");
}

// Um contentor ocupa sempre a largura toda do pai (como no Elementor) —
// mesmo dentro de um Contentor em linha, onde de outra forma encolhia para o
// tamanho do conteúdo e o "Em caixa" deixava de centrar. :where() = sem
// especificidade, por isso uma "Largura" definida em Avançado ganha sempre.
// Aplica-se ao item real do pai: o invólucro do Puck no editor, o nosso na
// página publicada.
export function fullWidthItemCss(id) {
  return `:where([data-style-id="${id}"]),:where([data-puck-component="${id}"]){width:100%}`;
}

// Espaçamento interno por omissão dos contentores: em caixa, só vertical (o
// gutter lateral é do .site-container); senão fica o do bloco (20px).
export function boxedDefaultPadding(defaultBoxed = true) {
  return (props) => (isBoxed(props?.contentWidth, defaultBoxed) ? { top: 20, right: 0, bottom: 20, left: 0, unit: "px" } : undefined);
}
