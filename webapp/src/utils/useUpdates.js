import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

import endpoints from "./endpoints";

// Segundos entre cada consulta de novas notificações/mensagens (VITE_POLL_INTERVAL)
const POLL_INTERVAL = (Number(import.meta.env.VITE_POLL_INTERVAL) || 30) * 1000;

/**
 * @function useUpdates
 * @description Notificações e tickets por ler. Em vez de um socket, de X em X segundos faz uma verificação leve (resumos) e só pede as
 * listas completas quando algo mudou; avisa (toast) das notificações e dos tickets novos. Pára enquanto a sessão está bloqueada.
 * @param {object} options
 * @param {object} options.user - Utilizador com sessão (id).
 * @param {boolean} options.locked - Sessão bloqueada por inatividade: não consulta.
 * @param {function} options.showToast - (título, descrição, endereço) mostra um aviso; clicar nele abre o endereço.
 * @param {{notifications: string|null, tickets: string}} options.paths - Páginas a abrir ao clicar nos avisos.
 * @param {function} options.refreshMenuBadges - Atualiza os sinais do menu do backoffice.
 */
export default function useUpdates({ user, locked, showToast, refreshMenuBadges, paths }) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0); // tickets com novidades por ler (ver /ticket/unreadCount)

  const unreadTicketsRef = useRef(0);
  const notificationSummaryRef = useRef(null); // último resumo (total, não lidas, última) para só pedir a lista quando muda
  const knownNotificationsRef = useRef(null); // ids já conhecidos (null até à 1ª leitura, para não avisar das antigas)
  const ticketsLoadedRef = useRef(false);
  const lockedRef = useRef(locked);
  const latest = useRef({});

  useEffect(() => {
    unreadTicketsRef.current = unreadTicketsCount;
  }, [unreadTicketsCount]);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  // As funções mudam a cada render: o temporizador usa sempre as mais recentes
  useEffect(() => {
    latest.current = { showToast, refreshMenuBadges, t, paths };
  });

  async function pollUpdates(auxUser) {
    latest.current.refreshMenuBadges?.();
    // Verificação leve: só se pede a lista completa de notificações quando o resumo mudou
    const [summaryRes, ticketsRes] = await Promise.allSettled([axios.get(endpoints.notification.summary), axios.get(endpoints.ticket.unreadCount)]);
    let notificationsRes = { status: "rejected" };
    if (summaryRes.status === "fulfilled") {
      const next = summaryRes.value.data;
      const prev = notificationSummaryRef.current;
      const changed = !prev || prev.total !== next.total || prev.unread !== next.unread || prev.latest_id !== next.latest_id;
      if (changed) {
        try {
          notificationsRes = { status: "fulfilled", value: await axios.get(endpoints.notification.readByUser, { params: { id_user: auxUser.id } }) };
          notificationSummaryRef.current = next;
        } catch {
          // tenta de novo na próxima verificação
        }
      }
    }

    // Notificações: avisa das que ainda não tinham aparecido e não foram lidas
    if (notificationsRes.status === "fulfilled") {
      const rows = notificationsRes.value.data;
      if (knownNotificationsRef.current) {
        rows.filter((n) => !knownNotificationsRef.current.has(n.id) && !n.is_read).forEach((n) => latest.current.showToast(n.title, n.description, latest.current.paths?.notifications));
      }
      knownNotificationsRef.current = new Set(rows.map((n) => n.id));
      setNotifications(rows);
    }

    // Tickets: avisa quando há mais por ler do que na última leitura
    if (ticketsRes.status === "fulfilled") {
      const count = ticketsRes.value.data.count || 0;
      if (ticketsLoadedRef.current && count > unreadTicketsRef.current) {
        latest.current.showToast(latest.current.t("New ticket activity"), latest.current.t("There is a new ticket or reply, go check it out!"), latest.current.paths?.tickets);
      }
      ticketsLoadedRef.current = true;
      setUnreadTicketsCount(count);
    }
  }

  // Polling: de X em X segundos procura notificações e mensagens novas (em vez de socket), com o separador à vista e a sessão desbloqueada
  useEffect(() => {
    if (!user.id) return;
    const poll = () => !document.hidden && !lockedRef.current && pollUpdates(user);
    const timer = setInterval(poll, POLL_INTERVAL);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function getNotifications(auxUser) {
    try {
      const res = await axios.get(endpoints.notification.readByUser, {
        params: { id_user: auxUser ? auxUser.id : user.id },
      });
      knownNotificationsRef.current = new Set(res.data.map((n) => n.id));
      setNotifications(res.data);
    } catch (err) {
      console.log(err);
    }
  }

  async function getTickets() {
    try {
      const res = await axios.get(endpoints.ticket.unreadCount);
      ticketsLoadedRef.current = true;
      setUnreadTicketsCount(res.data.count || 0);
    } catch (err) {
      console.log(err);
    }
  }

  // Fim da sessão: esquece o que sabia
  function resetUpdates() {
    setNotifications([]);
    setUnreadTicketsCount(0);
  }

  return { notifications, setNotifications, unreadTicketsCount, setUnreadTicketsCount, getNotifications, getTickets, resetUpdates };
}
