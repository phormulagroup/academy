import { useEffect, useState } from "react";

/**
 * @function useRetryLock
 * @description Hook para gerir bloqueios temporários por tentativas excessivas, com base na resposta da API.
 * @param {string} scope - Limite da API ("login", "otp_send", "otp", "recover" ou "code").
 * @param {string} email - E-mail a que o bloqueio se aplica.
 * @returns {{ scope: string, seconds: number, isLocked: boolean, time: string, lock: (seconds: number, forEmail?: string) => void }}
 */

// "scope:email" → fim do bloqueio (ms)
const locks = new Map();
const lockKey = (scope, email) => `${scope}:${String(email || "").trim().toLowerCase()}`;

// Versões anteriores guardavam os bloqueios e os passos pendentes no browser: limpa o que lá tenha ficado
try {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("retry_lock:"))
    .forEach((key) => localStorage.removeItem(key));
  ["pending_2fa", "pending_recover"].forEach((key) => sessionStorage.removeItem(key));
} catch {
  // sem acesso ao armazenamento: nada a limpar
}

function secondsLeft(scope, email) {
  if (!email) return 0;
  const until = locks.get(lockKey(scope, email)) || 0;
  const seconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  if (!seconds) locks.delete(lockKey(scope, email));
  return seconds;
}

// Limpa bloqueios que a API já levantou (ex.: a nova password limpa os limites "login" e "code" desse e-mail)
export function clearRetryLocks(email, scopes) {
  scopes.forEach((scope) => locks.delete(lockKey(scope, email)));
}

// Vários limites sobre o mesmo botão (ex.: login = password errada + códigos bloqueados): mostra o que acaba mais tarde.
// lock() grava no primeiro, que é o limite próprio desse botão (a API devolve já o maior dos tempos)
export function longestLock(primary, ...others) {
  const longest = [primary, ...others].reduce((a, b) => (b.seconds > a.seconds ? b : a));
  return { ...longest, lock: primary.lock };
}

// Resposta 429 da API ({ limit, retry_after }): bloqueia o limite indicado (um dos locks do ecrã, pelo scope)
export function lockFromResponse(data, locks, forEmail) {
  const target = locks.find((l) => l.scope === data?.limit) ?? locks[0];
  target.lock(data?.retry_after, forEmail);
}

// 754 → "12:34"
export const formatWait = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function useRetryLock(scope, email) {
  const [, setTick] = useState(0);
  const seconds = secondsLeft(scope, email);
  const isLocked = seconds > 0;

  // Enquanto houver bloqueio, volta a desenhar a cada segundo
  useEffect(() => {
    if (!isLocked) return;
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [isLocked, scope, email]);

  function lock(wait, forEmail = email) {
    if (!wait || !forEmail) return;
    locks.set(lockKey(scope, forEmail), Date.now() + Number(wait) * 1000);
    setTick((n) => n + 1);
  }

  return { scope, seconds, isLocked, time: formatWait(seconds), lock };
}
