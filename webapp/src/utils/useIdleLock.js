import { useEffect, useRef } from "react";

// Inatividade máxima antes de bloquear a sessão (por segurança, além da duração do token)
export const IDLE_MINUTES = 30;
export const ACTIVITY_KEY = "last_activity";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "mousedown", "keydown", "wheel", "scroll", "touchstart", "click"];

// Marca atividade agora (partilhada entre separadores através do localStorage)
export function touchActivity() {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    // sem localStorage: só se conta a atividade deste separador
  }
}

export function lastActivity() {
  try {
    const value = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

// Passou o limite desde a última atividade? (ex.: o browser ficou fechado ou o computador ficou a dormir)
export function isIdleExceeded(minutes = IDLE_MINUTES) {
  const last = lastActivity();
  return last !== null && Date.now() - last > minutes * 60 * 1000;
}

/**
 * @function useIdleLock
 * @description Chama onIdle quando a pessoa passa mais de IDLE_MINUTES sem atividade: sem mexer no rato, no teclado, no scroll ou no toque,
 * ou com o separador fora de vista. A reprodução de um vídeo (Vimeo ou <video>) conta como atividade enquanto estiver a tocar, para quem
 * está a ver uma aula não ser desligado.
 * @param {object} options
 * @param {boolean} options.enabled - Só conta com a sessão iniciada e desbloqueada.
 * @param {function} options.onIdle - Chamada uma vez quando o limite é ultrapassado.
 */
export default function useIdleLock({ enabled, onIdle }) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    const limit = IDLE_MINUTES * 60 * 1000;
    let lastWrite = 0;
    let vimeoPlaying = 0;
    let fired = false;
    const seen = new WeakSet();
    const players = [];
    let disposed = false;

    // Atividade da pessoa: guarda no máximo de 5 em 5 segundos (o mousemove dispara muitas vezes)
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      touchActivity();
    };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true, capture: true }));

    // Vídeos do Vimeo (iframes que aparecem e desaparecem com as páginas)
    const attachVimeo = async () => {
      const frames = [...document.querySelectorAll('iframe[src*="player.vimeo.com"]')].filter((f) => !seen.has(f));
      if (!frames.length) return;
      frames.forEach((f) => seen.add(f));
      const { default: Player } = await import("@vimeo/player");
      if (disposed) return;
      frames.forEach((frame) => {
        try {
          const player = new Player(frame);
          let playing = false;
          const set = (value) => {
            if (playing === value) return;
            playing = value;
            vimeoPlaying += value ? 1 : -1;
          };
          player.on("play", () => set(true));
          player.on("playing", () => set(true));
          player.on("pause", () => set(false));
          player.on("ended", () => set(false));
          players.push({ player, stop: () => set(false) });
        } catch {
          // iframe que não é um player válido
        }
      });
    };
    const observer = new MutationObserver(attachVimeo);
    observer.observe(document.body, { childList: true, subtree: true });
    attachVimeo();

    const nativePlaying = () => [...document.querySelectorAll("video, audio")].some((el) => !el.paused && !el.ended && el.readyState > 2);

    const check = () => {
      if (fired) return;
      // A ver um vídeo: conta como atividade
      if (vimeoPlaying > 0 || nativePlaying()) {
        touchActivity();
        return;
      }
      const last = lastActivity();
      if (last === null) {
        touchActivity();
        return;
      }
      if (Date.now() - last > limit) {
        fired = true;
        onIdleRef.current?.();
      }
    };
    const timer = setInterval(check, 10 * 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();

    return () => {
      disposed = true;
      clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity, { capture: true }));
      players.forEach(({ player, stop }) => {
        stop();
        player.off("play");
        player.off("playing");
        player.off("pause");
        player.off("ended");
      });
    };
  }, [enabled]);
}
