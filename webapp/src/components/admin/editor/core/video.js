import { createContext } from "react";
import { mediaSrc, safeHttpsUrl } from "./helpers";

// Contexto dado pela página do aluno (pages/app/course/topic.jsx) aos
// blocos de vídeo, para a regra "ver o vídeo até ao fim para avançar".
// Fora dessa página (editor, pré-visualização, apresentação) é null e o
// vídeo é só um player normal.
//
// valor: { enforce, getSavedTime(key), onProgress(key, seconds),
//          onEnded(key), onForwardSeek() }
export const VideoTrackingContext = createContext(null);

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

/**
 * Normaliza a origem de um bloco de vídeo:
 *   { provider: "vimeo"|"youtube"|"file", id, hash?, src?, key }
 * `key` é o que fica em course_video_progress.video_id (varchar 50) — para
 * o Vimeo continua a ser só o ID numérico (igual ao que já estava gravado
 * antes de haver YouTube/MP4), para não perder o progresso existente.
 */
export function parseVideoSource(props) {
  const source = props?.source || (props?.file?.url ? "file" : "url");

  if (source === "file") {
    const src = mediaSrc(props?.file);
    if (!src) return null;
    return { provider: "file", src, key: `file:${hash(props.file.url)}` };
  }

  const raw = (props?.url || props?.link || "").trim();
  if (!raw) return null;

  let u;
  try {
    u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host.endsWith("vimeo.com")) {
    const m = u.pathname.match(/(?:\/video)?\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (!m) return null;
    return { provider: "vimeo", id: m[1], hash: u.searchParams.get("h") || m[2] || null, key: m[1] };
  }

  if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{6,})/);
      id = m?.[1] || null;
    }
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return { provider: "youtube", id, key: `yt:${id}` };
  }

  // Ficheiro de vídeo direto noutro servidor (só https).
  if (/\.(mp4|webm|m4v|mov|ogv)(\?|$)/i.test(u.pathname)) {
    const src = safeHttpsUrl(u.toString());
    if (!src) return null;
    return { provider: "file", src, key: `url:${hash(src)}` };
  }

  return null;
}

// A API do YouTube é um script global — carregado uma única vez por
// janela (o editor desenha dentro de um iframe com a sua própria window).
const ytPromises = new WeakMap();
export function loadYouTubeApi(win = window) {
  if (win.YT && win.YT.Player) return Promise.resolve(win.YT);
  if (ytPromises.has(win)) return ytPromises.get(win);
  const p = new Promise((resolve, reject) => {
    const previous = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      resolve(win.YT);
    };
    const s = win.document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => {
      ytPromises.delete(win);
      reject(new Error("Não foi possível carregar o player do YouTube."));
    };
    win.document.head.appendChild(s);
  });
  ytPromises.set(win, p);
  return p;
}
