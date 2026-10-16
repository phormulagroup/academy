import { useEffect, useState } from "react";

export const isTouchDevice = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches;

export const isPortrait = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(orientation: portrait)").matches;

// Telemóvel pequeno (ecrã tátil com o lado mais curto até 480px): só aqui o ecrã inteiro roda sozinho
export const isSmallPhone = () => {
  if (!isTouchDevice()) return false;
  const width = window.screen?.width || window.innerWidth;
  const height = window.screen?.height || window.innerHeight;
  return Math.min(width, height) <= 480;
};

// Ecrã inteiro num telemóvel pequeno: tenta rodar para horizontal. Devolve true quando se deve
// mostrar a nota de rodar: o browser não deixa bloquear a orientação (ex.: Safari no iPhone) ou é um ecrã tátil
// maior (tablet), onde não se bloqueia a orientação (a nota só aparece na vertical, ver FullscreenRotateNote)
export default function useLandscapeLock(isFullscreen) {
  const [lockFailed, setLockFailed] = useState(false);
  const noteOnly = isFullscreen && isTouchDevice() && !isSmallPhone();

  useEffect(() => {
    if (!isFullscreen || !isSmallPhone()) return;
    let locked = false;
    // Só é possível com o ecrã inteiro ativo (depois de o requestFullscreen resolver)
    const tryLock = async () => {
      try {
        if (!document.fullscreenElement || !screen.orientation?.lock)
          throw new Error("unsupported");
        await screen.orientation.lock("landscape");
        locked = true;
      } catch {
        setLockFailed(true);
      }
    };
    if (document.fullscreenElement) tryLock();
    else {
      // O fullscreenchange pode chegar depois do estado; sem Fullscreen API fica a nota
      const onChange = () => document.fullscreenElement && tryLock();
      document.addEventListener("fullscreenchange", onChange, { once: true });
      const timer = setTimeout(() => {
        if (!document.fullscreenElement) setLockFailed(true);
      }, 600);
      return () => {
        document.removeEventListener("fullscreenchange", onChange);
        clearTimeout(timer);
        if (locked) unlock();
        setLockFailed(false);
      };
    }
    return () => {
      if (locked) unlock();
      setLockFailed(false);
    };
  }, [isFullscreen]);

  return isFullscreen && (lockFailed || noteOnly);
}

function unlock() {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // Sem suporte: nada a fazer
  }
}

