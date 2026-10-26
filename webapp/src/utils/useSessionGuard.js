import { useCallback, useEffect, useRef } from "react";
import axios from "axios";

import endpoints from "./endpoints";
import useIdleLock, { IDLE_MINUTES } from "./useIdleLock";
import { getStoredSession, hasStoredSession, sessionEnded } from "./sessionStore";

const PING_EVERY_MS = 60 * 1000;

/**
 * @function useSessionGuard
 * @description Vigia a sessão: (1) sai sozinha quando a sessão chega ao fim (ver SESSION_HOURS na API), também ao voltar ao separador;
 * (2) trata os 401 da API: sessão inválida/expirada termina a sessão, sessão bloqueada por inatividade abre o modal de desbloqueio;
 * (3) bloqueia a sessão após o limite de inatividade e envia à API um sinal de atividade (no máximo 1 por minuto), porque a API
 * também aplica o limite. Os pedidos automáticos (notificações, sinais do menu) não contam como atividade.
 * @param {object} options
 * @param {number} [options.userId] - Utilizador com sessão (sem ele nada se vigia).
 * @param {boolean} options.isLocked - Sessão bloqueada por inatividade.
 * @param {function} options.lock - Bloqueia a sessão (abre o modal).
 * @param {function} options.expire - Termina a sessão (token inválido/expirado).
 */
export default function useSessionGuard({ userId, isLocked, lock, expire }) {
  const handlers = useRef({ lock, expire });
  useEffect(() => {
    handlers.current = { lock, expire };
  });

  // 401 a meio da sessão. Os pedidos de /auth (login, recuperar palavra-passe, verificar sessão) têm tratamento próprio.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        const url = err.config?.url || "";
        if (err.response?.status === 401 && !url.includes("/auth/") && hasStoredSession()) {
          if (err.response.data?.code === "session_idle") handlers.current.lock();
          else handlers.current.expire();
        }
        return Promise.reject(err);
      },
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  // Fim da sessão: sai à hora certa e logo que se volta ao separador (um computador deixado aberto de um dia para o outro)
  useEffect(() => {
    if (!userId) return;
    const check = () => sessionEnded() && handlers.current.expire();
    const timer = setInterval(check, 30 * 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [userId]);

  // Sinal de atividade para a API (throttled)
  const lastPing = useRef(0);
  const ping = useCallback(() => {
    const now = Date.now();
    if (now - lastPing.current < PING_EVERY_MS) return;
    lastPing.current = now;
    axios.post(endpoints.auth.ping).catch((err) => {
      if (err.response?.status !== 401) return;
      if (err.response.data?.code === "session_idle") handlers.current.lock();
      else handlers.current.expire();
    });
  }, []);

  useIdleLock({
    enabled: !!userId && !isLocked,
    minutes: getStoredSession()?.idle ?? IDLE_MINUTES,
    onIdle: () => handlers.current.lock(),
    onActivity: ping,
  });
}
