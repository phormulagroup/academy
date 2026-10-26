import { useState } from "react";
import { withStyle } from "../../components/style";
import { withTabs } from "../../components/tabsField";
import { buttonsField, colorField, iconField, mediaField, switchField, textField } from "../../core/fields";
import { rule } from "../../core/css";
import { linkProps, mediaAlt, mediaSrc, safeHttpsUrl } from "../../core/helpers";
import ElementIcon from "../../core/icon";
import "./styles.css";

const STYLE_KEYS = ["accentColor", "titleColor", "iconBackground"];

const placeholderStyle = { padding: 24, textAlign: "center", border: "1px dashed #ccc", borderRadius: 8, color: "#999" };
const warningStyle = { ...placeholderStyle, borderColor: "#e5484d", color: "#e5484d" };

function AudioView({ id, source, file, url, title, description, cover, icon, showDownload, accentColor, titleColor, iconBackground, puck }) {
  const isEditing = puck?.isEditing;
  const [failed, setFailed] = useState(false);
  const isExternal = source === "url";
  // Só https para áudio externo: http seria bloqueado como conteúdo misto e
  // qualquer outro esquema (javascript:, data:) nunca deve chegar ao <audio>.
  const src = isExternal ? safeHttpsUrl(url) : mediaSrc(file);

  if (!src) {
    if (!isEditing) return null;
    if (isExternal && (url || "").trim()) return <div style={warningStyle}>O URL do áudio tem de ser um endereço https:// válido.</div>;
    return <div style={placeholderStyle}>{isExternal ? "Indique o URL https do ficheiro áudio" : "Escolha um ficheiro áudio"}</div>;
  }

  const coverSrc = mediaSrc(cover);
  const sel = `[data-style-id="${id}"] .el-audio`;
  const css = [
    rule(sel, { "--el-audio-accent": accentColor }),
    rule(`${sel} .el-audio__title`, { color: titleColor }),
    rule(`${sel} .el-audio__icon`, { background: iconBackground }),
  ]
    .filter(Boolean)
    .join("\n");
  const download = showDownload ? linkProps({ url: src, newTab: true }, isEditing) : null;
  const label = (title || "").trim() || "Áudio";

  return (
    <div className="el-audio">
      {css && <style>{css}</style>}
      {coverSrc ? (
        <img className="el-audio__cover" src={coverSrc} alt={mediaAlt(cover)} loading="lazy" />
      ) : (
        <span className="el-audio__icon" aria-hidden="true">
          <ElementIcon name={icon || "headphones"} size={26} />
        </span>
      )}
      <div className="el-audio__body">
        {(title || "").trim() && <div className="el-audio__title">{title}</div>}
        {(description || "").trim() && <p className="el-audio__desc">{description}</p>}
        {/* Nunca autoplay — os browsers bloqueiam-no e é má prática de
            acessibilidade. preload="metadata" mostra a duração sem
            descarregar o ficheiro inteiro. */}
        <audio
          key={src}
          className="el-audio__player"
          controls
          preload="metadata"
          src={src}
          aria-label={label}
          controlsList={showDownload ? undefined : "nodownload"}
          onError={() => setFailed(true)}
          onLoadedMetadata={() => setFailed(false)}
        >
          O seu browser não suporta a reprodução de áudio.
        </audio>
        {failed && <div className="el-audio__error">Não foi possível carregar o áudio.</div>}
        {download && (
          <a className="el-audio__download" {...download} download={isEditing ? undefined : ""}>
            <ElementIcon name="download" size={14} />
            <span>Descarregar áudio</span>
          </a>
        )}
      </div>
    </div>
  );
}

const AudioInner = {
  label: "Áudio",
  fields: {
    source: buttonsField("Origem", [
      { label: "Biblioteca", value: "library" },
      { label: "URL externo", value: "url" },
    ]),
    file: mediaField("Ficheiro áudio", { kind: "audio", showIf: (p) => p.source !== "url" }),
    url: textField("URL do áudio (https)", { placeholder: "https://…/episodio.mp3", showIf: (p) => p.source === "url", help: "Ligação direta para um ficheiro .mp3, .m4a, .ogg ou .wav." }),
    title: textField("Título"),
    description: textField("Descrição", { multiline: true, rows: 2 }),
    cover: mediaField("Imagem de capa (opcional)", { withAlt: true }),
    icon: iconField("Ícone (sem capa)", { showIf: (p) => !mediaSrc(p.cover) }),
    showDownload: switchField("Mostrar botão de descarregar"),

    accentColor: colorField("Cor de destaque", { section: "Leitor" }),
    titleColor: colorField("Cor do título", { section: "Leitor" }),
    iconBackground: colorField("Fundo do ícone", { section: "Leitor" }),
  },
  defaultProps: {
    source: "library",
    file: null,
    url: "",
    title: "",
    description: "",
    cover: null,
    icon: "headphones",
    showDownload: false,
    style: {
      background: "#F2F3F5",
      borderRadius: { topLeft: 12, topRight: 12, bottomRight: 12, bottomLeft: 12 },
      padding: { desktop: { top: 16, right: 16, bottom: 16, left: 16 } },
    },
  },
  render: (p) => <AudioView {...p} />,
};

const Audio = withTabs(withStyle(AudioInner, { exclude: ["color"] }), { styleKeys: STYLE_KEYS });

export default Audio;
