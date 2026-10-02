import { useEffect, useState } from "react";
import { MdOutlineBook } from "react-icons/md";
import { useTranslation } from "react-i18next";

import config from "../../utils/config";
import logoColor from "../../assets/BIAL-Regional-Academy.png";
import "./courseLoading.css";

// Ecrã de entrada no e-Learning (pages/app/course/eLearning.jsx): fundo com as cores da Bial, a capa do curso com um anel
// a pulsar, o logótipo com um brilho a passar por dentro, uma barra a deslizar e "A carregar o curso X".
// As animações estão em courseLoading.css e param com "reduzir movimento".
// O ecrã pode aparecer em duas instâncias seguidas (carregamento + espera mínima): este estado vive fora do componente para
// a 2.ª saber que continua o mesmo ecrã e não repetir a animação de entrada.
const session = { startedAt: 0, lastSeenAt: 0, active: 0 };
const CONTINUE_WINDOW_MS = 3000;

function startSession() {
  const now = Date.now();
  const continuing = session.active > 0 || now - session.lastSeenAt < CONTINUE_WINDOW_MS;
  if (!continuing) session.startedAt = now;
  return { continuing, elapsed: (now - session.startedAt) / 1000 };
}

export default function CourseLoading({ courseName, thumbnail }) {
  const { t } = useTranslation();
  const [{ continuing, elapsed }] = useState(startSession);

  useEffect(() => {
    session.active += 1;
    return () => {
      session.active -= 1;
      session.lastSeenAt = Date.now();
    };
  }, []);

  return (
    <div
      className={`course-loader ${continuing ? "course-loader-continue" : ""} relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-[#163986] px-6`}
      style={{ "--cl-elapsed": `${elapsed}s` }}
      role="status"
      aria-live="polite">
      <div className="course-loader-glow" aria-hidden="true" />

      <div className="relative flex flex-col items-center">
        <div className="course-loader-mark">
          <div
            className="w-[84px] h-[84px] rounded-[22px] bg-white bg-cover bg-center flex items-center justify-center border border-solid border-[#163986]/15 shadow-[0px_6px_20px_#16398620]"
            style={thumbnail ? { backgroundImage: `url(${config.server_ip}/media/${thumbnail})` } : undefined}>
            {!thumbnail && <MdOutlineBook className="text-[38px] text-[#163986]" />}
          </div>
          <span className="course-loader-ring" aria-hidden="true" />
        </div>

        <div className="course-loader-wordmark mt-8">
          <img src={logoColor} alt="" className="h-12 w-auto max-w-[220px] object-contain" />
          <span className="course-loader-shine" aria-hidden="true" style={{ WebkitMaskImage: `url("${logoColor}")`, maskImage: `url("${logoColor}")` }} />
        </div>

        <div className="course-loader-bar mt-10" aria-hidden="true">
          <span />
        </div>

        <div className="course-loader-fade mt-6 flex min-h-16 max-w-[520px] flex-col items-center text-center">
          <p className="text-[11px] tracking-[4px] uppercase text-[#163986]/60 mb-2!">{t("Loading the course")}</p>
          <p className="text-lg sm:text-xl font-semibold text-[#163986]! mb-1!">{courseName || "…"}</p>
          <p className="text-sm text-[#163986]/70! mb-0!">{t("Preparing your modules and your progress")}…</p>
        </div>
      </div>
    </div>
  );
}
