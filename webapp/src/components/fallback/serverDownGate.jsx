import { useEffect, useRef, useState } from "react";

import FallbackScreen from "./fallbackScreen";
import { fallbackTexts } from "./fallbackTexts";
import { checkServer, getServerState, subscribeServerState } from "../../utils/serverStatus";

const RETRY_SECONDS = 10;

// Ecrã com a contagem para a próxima tentativa; só existe enquanto o servidor está em baixo (a contagem recomeça sempre que aparece)
function ServerDownScreen() {
  const [seconds, setSeconds] = useState(RETRY_SECONDS);
  const [isChecking, setIsChecking] = useState(false);
  const left = useRef(RETRY_SECONDS);

  async function retry() {
    left.current = RETRY_SECONDS;
    setSeconds(RETRY_SECONDS);
    setIsChecking(true);
    await checkServer();
    setIsChecking(false);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      left.current -= 1;
      if (left.current <= 0) retry();
      else setSeconds(left.current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const texts = fallbackTexts();
  const [title, text] = navigator.onLine ? texts.down : texts.offline;
  return <FallbackScreen title={title} text={text} status={texts.retrying(seconds)} actionLabel={texts.retry} onAction={retry} loading={isChecking} />;
}

// Mostra o ecrã de "servidor em baixo / manutenção" por cima da app enquanto a API não responde.
// A app por baixo não é desmontada, por isso o estado mantém-se se o servidor voltar a meio da sessão.
export default function ServerDownGate({ children }) {
  const [state, setState] = useState(getServerState());
  const wasDown = useRef(false);

  useEffect(() => subscribeServerState(setState), []);

  // O servidor voltou: se a app nunca chegou a arrancar (sem línguas/rotas) tem de recarregar
  useEffect(() => {
    if (!state.down && !state.hadSuccess && wasDown.current) window.location.reload();
    wasDown.current = state.down;
  }, [state]);

  return (
    <>
      {children}
      {state.down && <ServerDownScreen />}
    </>
  );
}
