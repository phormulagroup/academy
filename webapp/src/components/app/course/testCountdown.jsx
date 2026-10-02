import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PiHourglassMediumDuotone } from "react-icons/pi";
import dayjs from "dayjs";

// Tempo restante (ms) dividido em dias / horas / minutos / segundos
function splitTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * @component TestCountdown
 * @description Contagem decrescente até à data de início de um teste (alunos). Ao chegar a zero chama
 * onReachZero para o teste ficar disponível sem recarregar a página.
 * @param {string} startDate - Data de início do teste (settings.start_date).
 * @param {Function} onReachZero - Chamada uma vez quando o tempo termina.
 */
function TestCountdown({ startDate, onReachZero }) {
  const { t } = useTranslation();
  const target = dayjs(startDate).valueOf();
  const [remaining, setRemaining] = useState(() => target - Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    const tick = () => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(interval);
        onReachZero?.();
      }
    };
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [target]);

  const { days, hours, minutes, seconds } = splitTime(remaining);
  const tiles = [
    { value: days, label: t("Days") },
    { value: hours, label: t("Hours") },
    { value: minutes, label: t("Minutes") },
    { value: seconds, label: t("Seconds") },
  ];

  return (
    <div className="flex flex-col items-center text-center bg-white border-2 border-dashed border-[#00B9D6] rounded-[5px] mt-4 p-4 sm:p-6 lg:p-8">
      <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-[#F1F9FF] border-2 border-dashed border-[#00B9D6] flex items-center justify-center">
        <PiHourglassMediumDuotone className="text-[24px] sm:text-[28px] lg:text-[32px] text-[#00B9D6]" />
      </div>
      <p className="font-ryker font-bold text-[#163986] leading-tight mt-3 sm:mt-4 text-[16px] sm:text-[19px] lg:text-[22px]">
        {t("This test is not available yet")}
      </p>
      <p className="text-[#8B9CC3] text-[12px] sm:text-[14px] mt-1">
        {t("Available from")} {dayjs(startDate).format("DD/MM/YYYY HH:mm")}
      </p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full max-w-120 mt-4 sm:mt-6">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col items-center justify-center bg-[#163986] rounded-[5px] py-2 sm:py-3 lg:py-4">
            <span className="font-ryker font-bold text-white tabular-nums leading-none text-[22px] sm:text-[30px] lg:text-[36px]">
              {String(tile.value).padStart(2, "0")}
            </span>
            <span className="text-[#C5CEE1] uppercase tracking-wide mt-1 sm:mt-2 text-[9px] sm:text-[11px] lg:text-[12px]">
              {tile.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TestCountdown;
