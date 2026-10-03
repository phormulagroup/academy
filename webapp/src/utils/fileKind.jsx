import { LuFile, LuFileImage, LuFileText, LuFileVideo, LuPresentation } from "react-icons/lu";

const EXTENSIONS = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"],
  pdf: ["pdf"],
  presentation: ["ppt", "pptx", "key"],
  video: ["mp4", "mov", "webm", "avi", "mkv"],
};

const VISUALS = {
  image: { Icon: LuFileImage, color: "#163986" },
  pdf: { Icon: LuFileText, color: "#E5484D" },
  presentation: { Icon: LuPresentation, color: "#F76B15" },
  video: { Icon: LuFileVideo, color: "#8E4EC6" },
  other: { Icon: LuFile, color: "#8A8D98" },
};

// Tipo de um ficheiro pela extensão, com o ícone e a cor que o representam (iguais em toda a plataforma)
export function fileKind(name) {
  // O valor pode vir vazio ou nulo da base de dados
  const ext = (String(name ?? "").split(".").pop() || "").toLowerCase();
  const type = Object.keys(EXTENSIONS).find((k) => EXTENSIONS[k].includes(ext)) || "other";
  return { type, ext, ...VISUALS[type] };
}

// Fundo xadrez: mostra bem as imagens com transparência (PNG/SVG)
export const CHECKER = {
  backgroundImage: "linear-gradient(45deg,#eef0f4 25%,transparent 25%),linear-gradient(-45deg,#eef0f4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eef0f4 75%),linear-gradient(-45deg,transparent 75%,#eef0f4 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
  backgroundColor: "#fff",
};

// Caixa colorida com o ícone do tipo de ficheiro
export function FileBadge({ name, size = 48 }) {
  const { Icon, color } = fileKind(name);
  return (
    <span className="grid place-items-center rounded-xl shrink-0" style={{ width: size, height: size, fontSize: size * 0.54, background: `${color}14`, color }}>
      <Icon />
    </span>
  );
}
