import { useEffect, useRef, useState } from "react";
import axios from "axios";

import endpoints from "./endpoints";

/**
 * @function useMenuBadges
 * @description Sinais de novidades no menu do backoffice: registos por aprovar e mensagens do formulário de contacto por ler.
 * Só se pedem a quem tem acesso a alguma secção (a API recusa os outros).
 * @param {object} options
 * @param {number} [options.userId] - Utilizador com sessão.
 * @param {boolean} options.isStaff - Tem acesso ao backoffice (Admin ou alguma secção).
 * @returns {{ menuBadges: {users: number, answers: number}, refreshMenuBadges: function }}
 */
export default function useMenuBadges({ userId, isStaff }) {
  const [menuBadges, setMenuBadges] = useState({ users: 0, answers: 0 });
  const isStaffRef = useRef(false);
  useEffect(() => {
    isStaffRef.current = isStaff;
  }, [isStaff]);

  async function refreshMenuBadges() {
    if (!isStaffRef.current) return;
    try {
      const res = await axios.get(endpoints.dashboard.badges);
      setMenuBadges((prev) => (prev.users === res.data.users && prev.answers === res.data.answers ? prev : { users: res.data.users || 0, answers: res.data.answers || 0 }));
    } catch {
      // sem sinais por agora
    }
  }

  // Ao entrar (e quando as permissões chegam) pede-se uma vez; depois o polling das novidades atualiza-os
  useEffect(() => {
    if (!isStaff || !userId) return;
    isStaffRef.current = true;
    refreshMenuBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isStaff]);

  return { menuBadges, refreshMenuBadges };
}
