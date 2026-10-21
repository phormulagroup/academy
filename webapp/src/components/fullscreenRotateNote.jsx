import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdScreenRotation } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { isPortrait, isTouchDevice } from "../utils/useLandscapeLock";

// Nota pequena (fechável) a pedir para rodar o telemóvel: só em ecrã inteiro, ecrã tátil e na vertical
export default function FullscreenRotateNote({ active }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [portrait, setPortrait] = useState(isPortrait());

  useEffect(() => {
    const mq = window.matchMedia?.("(orientation: portrait)");
    if (!mq) return;
    const onChange = () => setPortrait(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Volta a aparecer da próxima vez que se entrar no ecrã inteiro
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setDismissed(false);
  }

  if (!active || dismissed || !portrait || !isTouchDevice()) return null;

  return (
    <div className="fs-rotate-note" role="status">
      <MdScreenRotation className="fs-rotate-note-icon" aria-hidden="true" />
      <span>{t("Rotate your phone for a better experience")}</span>
      <button
        type="button"
        className="fs-rotate-note-close"
        onClick={() => setDismissed(true)}
        aria-label={t("Close")}>
        <IoClose />
      </button>
    </div>
  );
}
