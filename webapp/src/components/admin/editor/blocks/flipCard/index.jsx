import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, headingField, iconField, linkField, mediaField, responsive, selectField, sliderField, switchField, textField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import { mediaAlt, mediaSrc } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import { BUTTON_VARIANTS, ElButton } from "../button";
import "./styles.css";

// Em dispositivos com rato o "Passar o rato" funciona por CSS; em ecrãs
// táteis não há hover, por isso aí o toque vira sempre o cartão.
function canHover(el) {
  try {
    const win = el?.ownerDocument?.defaultView || window;
    return win.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;
  }
}

function FlipCardView(props) {
  const {
    id,
    frontIcon,
    frontImage,
    frontTitle,
    frontText,
    backTitle,
    backText,
    buttonLabel,
    buttonLink,
    previewBack,
    direction,
    trigger,
    height,
    contentAlign,
    frontBackground,
    frontColor,
    backBackground,
    backColor,
    iconColor,
    radius,
    buttonVariant,
    puck,
  } = props;
  const isEditing = puck?.isEditing;
  const [flippedState, setFlipped] = useState(false);
  // No editor o lado visível depende só do interruptor "Mostrar o verso",
  // para o hover/clique não virarem o cartão enquanto se edita.
  const flipped = isEditing ? !!previewBack : flippedState;
  const hoverMode = trigger !== "click" && !isEditing;
  const dir = ["left", "right", "up", "down"].includes(direction) ? direction : "right";

  const onCardClick = (e) => {
    if (isEditing) return;
    if (e.target.closest("a, button")) return;
    if (hoverMode && canHover(e.currentTarget)) return;
    setFlipped((f) => !f);
  };

  const sel = `[data-style-id="${id}"] .el-flip`;
  const css = [
    rule(sel, {
      "--el-flip-front-bg": frontBackground,
      "--el-flip-front-color": frontColor,
      "--el-flip-back-bg": backBackground,
      "--el-flip-back-color": backColor,
      "--el-flip-icon": iconColor,
      "--el-flip-radius": radius !== undefined && radius !== null ? `${radius}px` : undefined,
    }),
    responsiveRules(sel, (d) => ({ height: unitToCss(own(height, d)) })),
  ]
    .filter(Boolean)
    .join("\n");

  const src = mediaSrc(frontImage);
  const classes = [
    "el-flip",
    `el-flip--${dir}`,
    hoverMode ? "el-flip--hover" : "el-flip--click",
    flipped ? "el-flip--flipped" : "",
    `el-flip--align-${contentAlign || "center"}`,
  ]
    .filter(Boolean)
    .join(" ");

  // Em modo de clique, o lado escondido fica inerte (sem foco nem leitor de
  // ecrã). Em modo hover ambos ficam acessíveis: o verso vira por
  // :focus-within quando se navega até ao botão com o teclado.
  const hideFront = !isEditing && !hoverMode && flipped;
  const hideBack = !isEditing && !hoverMode && !flipped;
  const toggleLabel = flipped ? "Mostrar a frente do cartão" : "Mostrar o verso do cartão";

  return (
    <div className={classes} onClick={onCardClick}>
      {css && <style>{css}</style>}
      <div className="el-flip__inner">
        <div className="el-flip__face el-flip__front" aria-hidden={hideFront || undefined} inert={hideFront || undefined}>
          {src && <img className="el-flip__image" src={src} alt={mediaAlt(frontImage)} loading="lazy" />}
          <div className="el-flip__content">
            {frontIcon && (
              <span className="el-flip__icon">
                <ElementIcon name={frontIcon} size={40} />
              </span>
            )}
            {frontTitle && <p className="el-flip__title">{frontTitle}</p>}
            {frontText && <p className="el-flip__text">{frontText}</p>}
          </div>
        </div>
        <div className="el-flip__face el-flip__back" aria-hidden={hideBack || undefined} inert={hideBack || undefined}>
          <div className="el-flip__content">
            {backTitle && <p className="el-flip__title">{backTitle}</p>}
            {backText && <p className="el-flip__text">{backText}</p>}
            {buttonLabel && (
              <ElButton label={buttonLabel} link={buttonLink} variant={buttonVariant || "light"} size="sm" isEditing={isEditing} className="el-flip__button" />
            )}
          </div>
        </div>
      </div>
      {!isEditing && (
        <button type="button" className="el-flip__toggle" aria-pressed={flipped} aria-label={toggleLabel} title={toggleLabel} onClick={() => setFlipped((f) => !f)}>
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

const FlipCardInner = {
  label: "Cartão giratório",
  fields: {
    _front: headingField("Frente"),
    frontIcon: iconField("Ícone"),
    frontImage: mediaField("Imagem", { withAlt: true }),
    frontTitle: textField("Título"),
    frontText: textField("Texto", { multiline: true }),
    _back: headingField("Verso"),
    backTitle: textField("Título"),
    backText: textField("Texto", { multiline: true }),
    buttonLabel: textField("Texto do botão", { placeholder: "Deixe vazio para não mostrar botão" }),
    buttonLink: linkField("Link do botão"),
    _editor: headingField("Editor"),
    previewBack: switchField("Mostrar o verso (só no editor)"),
    direction: buttonsField("Direção do giro", [
      { label: "Esquerda", value: "left" },
      { label: "Direita", value: "right" },
      { label: "Cima", value: "up" },
      { label: "Baixo", value: "down" },
    ]),
    trigger: buttonsField("Virar ao", [
      { label: "Passar o rato", value: "hover", title: "Em ecrãs táteis vira sempre ao tocar" },
      { label: "Clique / toque", value: "click" },
    ]),
    height: responsive(unitField("Altura", { units: ["px", "vh"], maxByUnit: { px: 900, vh: 100 } })),
    contentAlign: buttonsField("Posição do conteúdo", [
      { label: "Topo", value: "start" },
      { label: "Centro", value: "center" },
      { label: "Fundo", value: "end" },
    ]),
    frontBackground: colorField("Fundo da frente", { section: "Cartão" }),
    frontColor: colorField("Texto da frente", { section: "Cartão" }),
    iconColor: colorField("Cor do ícone", { section: "Cartão" }),
    backBackground: colorField("Fundo do verso", { section: "Cartão" }),
    backColor: colorField("Texto do verso", { section: "Cartão" }),
    radius: sliderField("Raio dos cantos", { min: 0, max: 48, suffix: "px", section: "Cartão" }),
    buttonVariant: selectField("Estilo do botão", BUTTON_VARIANTS, { section: "Cartão" }),
  },
  defaultProps: {
    frontIcon: "heart-pulse",
    frontImage: null,
    frontTitle: "Sabia que…?",
    frontText: "Passe o rato ou toque para descobrir.",
    backTitle: "Atividade física",
    backText: "150 minutos de atividade moderada por semana trazem benefícios claros para a saúde cardiovascular.",
    buttonLabel: "Saber mais",
    buttonLink: { url: "#" },
    previewBack: false,
    direction: "right",
    trigger: "hover",
    height: { desktop: { value: 320, unit: "px" } },
    contentAlign: "center",
    frontBackground: "var(--brand-primary)",
    frontColor: "#ffffff",
    iconColor: "#ffffff",
    backBackground: "var(--brand-primary-dark)",
    backColor: "#ffffff",
    radius: 16,
    buttonVariant: "light",
  },
  render: (props) => <FlipCardView {...props} />,
};

const FlipCard = withTabs(withStyle(FlipCardInner, { exclude: ["color", "background", "gradient", "backgroundImage", "overlayColor"] }), {
  containerKeys: ["direction", "trigger", "height", "contentAlign"],
  styleKeys: ["frontBackground", "frontColor", "iconColor", "backBackground", "backColor", "radius", "buttonVariant"],
});

export default FlipCard;
