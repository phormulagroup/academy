import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PiCalendarCheckDuotone, PiCalendarXDuotone, PiHourglassMediumDuotone } from "react-icons/pi";
import dayjs from "dayjs";
import { serverNow } from "../../../utils/serverClock";

const HOUR = 3600 * 1000;

// Tempo que falta, em texto curto: "2 d 5 h", "5 h 19 min" ou, na última hora, "42 min 10 s"
function formatLeft(ms, t) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days} ${t("d")} ${hours} ${t("h")}`;
  if (hours > 0) return `${hours} ${t("h")} ${String(minutes).padStart(2, "0")} ${t("min")}`;
  return `${minutes} ${t("min")} ${String(seconds).padStart(2, "0")} ${t("s")}`;
}

/**
 * @component TestDeadline
 * @description Aviso do prazo de um teste aberto (alunos): até quando se pode fazer e quanto falta. Neutro enquanto faltam mais de 24 h,
 * laranja nas últimas 24 h e vermelho na última hora. Ao chegar ao fim muda para "prazo terminado" e chama onEnded.
 * @param {number} endMs - Instante em que o teste fecha (ms), já com as datas do país da pessoa; a contagem usa a hora do servidor.
 * @param {boolean} [compact] - Versão de uma linha (durante o teste).
 * @param {function} [onEnded] - Chamada uma vez quando o prazo termina.
 */
export default function TestDeadline({ endMs, compact = false, onEnded }) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(() => endMs - serverNow());

  useEffect(() => {
    let ended = false;
    const tick = () => {
      const remaining = endMs - serverNow();
      setLeft(remaining);
      if (remaining <= 0 && !ended) {
        ended = true;
        onEnded?.();
      }
    };
    tick();
    // Segundo a segundo só quando faltam menos de 24 h; antes basta de minuto a minuto
    const interval = setInterval(tick, endMs - serverNow() > 24 * HOUR ? 30000 : 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endMs]);

  const ended = left <= 0;
  const urgent = !ended && left <= HOUR;
  const soon = !ended && left <= 24 * HOUR;
  const tone = ended ? "bg-[#8B9CC3] text-white" : urgent ? "bg-[#DB0709] text-white" : soon ? "bg-[#FF7D5A] text-white" : "bg-white text-[#163986] border-2 border-dashed border-[#00B9D6]";
  const Icon = ended ? PiCalendarXDuotone : soon ? PiHourglassMediumDuotone : PiCalendarCheckDuotone;
  const date = dayjs(endMs).format("DD/MM/YYYY HH:mm");

  return (
    <div role={soon ? "alert" : "status"} className={`flex items-center gap-3 rounded-[5px] mt-4 ${compact ? "p-2 sm:p-3" : "p-3 sm:p-4"} ${tone}`}>
      <Icon className={`shrink-0 ${compact ? "w-5 h-5 sm:w-6 sm:h-6" : "w-6 h-6 sm:w-8 sm:h-8"} ${soon || ended ? "" : "text-[#00B9D6]"}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className={`font-ryker font-bold leading-tight ${compact ? "text-[13px] sm:text-[14px]" : "text-[14px] sm:text-[16px] lg:text-[18px]"}`}>
          {ended ? t("The deadline for this test has ended") : soon ? `${t("The deadline for this test ends in")} ${formatLeft(left, t)}` : `${t("Available until")} ${date}`}
        </p>
        {!compact && (
          <p className="text-[12px] sm:text-[13px] lg:text-[14px] mt-0.5">
            {ended ? t("It can no longer be taken. Contact your representative if you need access.") : soon ? `${t("Available until")} ${date}` : t("Complete it before the deadline to finish the course")}
          </p>
        )}
      </div>
    </div>
  );
}
