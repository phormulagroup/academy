import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import { LuTimer } from "react-icons/lu";

/**
 * Bloqueio por demasiadas tentativas nos formulários de autenticação (ver utils/useRetryLock):
 * RetryNotice mostra a contagem até poder tentar outra vez; RetryTooltip explica, sobre o botão desativado, quando volta a ficar disponível.
 */

// text: o motivo do bloqueio, específico de cada caso (ex.: "Too many wrong passwords. You can try again in"), seguido do tempo
export function RetryNotice({ lock, text = "Too many attempts. You can try again in" }) {
  const { t } = useTranslation();
  if (!lock.isLocked) return null;
  return (
    <p className="auth-retry-notice" role="status" aria-live="polite">
      <LuTimer className="shrink-0" />
      <span>
        {t(text)} <b className="tabular-nums">{lock.time}</b>
      </span>
    </p>
  );
}

// O antd não mostra tooltips em botões desativados sem um elemento à volta (o span recebe o rato)
export function RetryTooltip({ lock, children }) {
  const { t } = useTranslation();
  if (!lock.isLocked) return children;
  return (
    <Tooltip title={t("Available again in {{time}}", { time: lock.time })}>
      <span className="block w-full cursor-not-allowed">{children}</span>
    </Tooltip>
  );
}
