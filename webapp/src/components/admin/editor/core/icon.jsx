import { memo } from "react";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";

const ICON_SET = new Set(iconNames);

// Os ícones guardados antes vinham em PascalCase ("Feather", "Star") ou em
// kebab-case (nome do lucide) — normaliza sempre para kebab-case, que é o
// que o DynamicIcon aceita. Um nome desconhecido devolve null (em vez de
// rebentar a página do aluno).
export function normalizeIconName(name) {
  if (!name || typeof name !== "string") return null;
  if (ICON_SET.has(name)) return name;
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();
  if (ICON_SET.has(kebab)) return kebab;
  const compact = name.toLowerCase();
  return ICON_SET.has(compact) ? compact : null;
}

// Carrega só o ícone pedido (import dinâmico por ícone), em vez de montar
// à cabeça um mapa com os ~1500 ícones como os blocos antigos faziam.
function ElementIcon({ name, size = 24, color, strokeWidth, className, style }) {
  const n = normalizeIconName(name);
  if (!n) return null;
  return (
    <DynamicIcon
      name={n}
      size={size}
      color={color || "currentColor"}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      fallback={() => <span style={{ display: "inline-block", width: size, height: size }} />}
      aria-hidden="true"
    />
  );
}

export default memo(ElementIcon);
