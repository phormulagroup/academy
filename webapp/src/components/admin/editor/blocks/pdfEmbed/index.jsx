import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, mediaField, responsive, selectField, switchField, textField, unitField } from "../../core/fields";
import { responsiveRules, own, rule, unitToCss } from "../../core/css";
import { mediaSrc } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import { BUTTON_SIZES, BUTTON_VARIANTS, ElButton } from "../button";
import "./styles.css";

const CONTAINER_KEYS = ["displayMode", "height", "mobileButtonOnly"];
const STYLE_KEYS = ["cardBackground", "iconColor", "buttonVariant", "buttonSize"];

const placeholderStyle = { padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" };

// Nome legível do ficheiro a partir do que a biblioteca guarda ({url:
// "nome.pdf"}) ou de um URL absoluto antigo.
function fileNameOf(value) {
  const raw = typeof value === "string" ? value : value?.url;
  if (!raw) return "";
  const last = String(raw).split("?")[0].split("#")[0].split("/").pop() || "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

function PdfCard({ title, fileName, src, action, buttonVariant, buttonSize, isEditing, className = "" }) {
  const isDownload = action === "download";
  return (
    <div className={`el-pdf__card ${className}`.trim()}>
      <span className="el-pdf__icon" aria-hidden="true">
        <ElementIcon name="file-text" size={28} />
      </span>
      <div className="el-pdf__info">
        <div className="el-pdf__title">{title || fileName || "Documento PDF"}</div>
        {title && fileName && <div className="el-pdf__file">{fileName}</div>}
      </div>
      {/* Abre sempre num separador novo: o ficheiro vem do domínio da API,
          onde o atributo `download` é ignorado pelos browsers (origem
          diferente) — o visualizador de PDF do browser tem o botão de
          descarregar. */}
      <ElButton
        label={isDownload ? "Descarregar" : "Abrir PDF"}
        icon={isDownload ? "download" : "external-link"}
        link={{ url: src, newTab: true }}
        variant={buttonVariant || "primary"}
        size={buttonSize || "md"}
        isEditing={isEditing}
        className="el-pdf__button"
      />
    </div>
  );
}

function PdfView({ id, file, title, displayMode, height, mobileButtonOnly, buttonAction, cardBackground, iconColor, buttonVariant, buttonSize, puck }) {
  const isEditing = puck?.isEditing;
  const src = mediaSrc(file);
  if (!src) return isEditing ? <div style={placeholderStyle}>Escolha um ficheiro PDF</div> : null;

  const fileName = fileNameOf(file);
  const cleanTitle = (title || "").trim();
  const sel = `[data-style-id="${id}"] .el-pdf`;
  const css = [
    responsiveRules(`${sel} .el-pdf__frame`, (d) => ({ height: unitToCss(own(height, d)) })),
    rule(`${sel} .el-pdf__card`, { background: cardBackground }),
    rule(`${sel} .el-pdf__icon`, { color: iconColor }),
  ]
    .filter(Boolean)
    .join("\n");
  const cardProps = { title: cleanTitle, fileName, src, action: buttonAction, buttonVariant, buttonSize, isEditing };

  if (displayMode === "button") {
    return (
      <div className="el-pdf">
        {css && <style>{css}</style>}
        <PdfCard {...cardProps} />
      </div>
    );
  }

  // Embutido. O Safari de iOS (e muitos browsers Android) só mostram a
  // primeira página de um PDF num iframe, sem deslocar — por isso, em
  // mobile, a opção (ligada por omissão) troca o iframe por um cartão.
  const mobileCard = mobileButtonOnly !== false;
  return (
    <div className={`el-pdf el-pdf--embed${mobileCard ? " el-pdf--mobile-card" : ""}${isEditing ? " el-pdf--editing" : ""}`}>
      {css && <style>{css}</style>}
      {cleanTitle && <div className="el-pdf__heading">{cleanTitle}</div>}
      <div className="el-pdf__frame-wrap">
        <iframe className="el-pdf__frame" src={src} title={cleanTitle || fileName || "Documento PDF"} loading="lazy" />
        <a className="el-pdf__fallback" href={isEditing ? "#" : src} target="_blank" rel="noopener noreferrer" tabIndex={isEditing ? -1 : undefined} onClick={isEditing ? (e) => e.preventDefault() : undefined}>
          Não vê o documento? Abrir o PDF num separador novo
        </a>
      </div>
      {mobileCard && <PdfCard {...cardProps} className="el-pdf__card--mobile" />}
    </div>
  );
}

const PdfEmbedInner = {
  label: "PDF",
  fields: {
    file: mediaField("Ficheiro PDF", { kind: "pdf" }),
    title: textField("Título", { placeholder: "Ex.: Guia de apoio da lição" }),
    buttonAction: buttonsField("Botão", [
      { label: "Abrir", value: "open" },
      { label: "Descarregar", value: "download" },
    ]),

    displayMode: buttonsField("Apresentação", [
      { label: "Embutido", value: "embed" },
      { label: "Só botão", value: "button" },
    ]),
    height: responsive(unitField("Altura", { units: ["px", "vh"], min: 200, maxByUnit: { px: 1600, vh: 100 }, showIf: (p) => p.displayMode !== "button" })),
    mobileButtonOnly: switchField("Em mobile mostrar só botão", { showIf: (p) => p.displayMode !== "button" }),

    cardBackground: colorField("Fundo do cartão", { section: "Cartão" }),
    iconColor: colorField("Cor do ícone", { section: "Cartão" }),
    buttonVariant: selectField("Estilo do botão", BUTTON_VARIANTS, { section: "Botão" }),
    buttonSize: buttonsField("Tamanho do botão", BUTTON_SIZES, { section: "Botão" }),
  },
  defaultProps: {
    file: null,
    title: "",
    buttonAction: "open",
    displayMode: "embed",
    height: { desktop: { value: 700, unit: "px" }, mobile: { value: 500, unit: "px" } },
    mobileButtonOnly: true,
    buttonVariant: "primary",
    buttonSize: "md",
  },
  render: (p) => <PdfView {...p} />,
};

const PdfEmbed = withTabs(withStyle(PdfEmbedInner, { exclude: ["color"] }), { containerKeys: CONTAINER_KEYS, styleKeys: STYLE_KEYS });

export default PdfEmbed;
