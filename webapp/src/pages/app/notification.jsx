import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { Button, Pagination, Segmented, Skeleton } from "antd";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { LuBell, LuBellOff, LuBellRing, LuCheck, LuCheckCheck, LuClock } from "react-icons/lu";

import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

const PAGE_SIZE = 8;

// Dia da notificação: "Hoje", "Ontem" ou a data (as mais recentes vêm primeiro, por isso o cabeçalho só aparece quando o dia muda)
function dayLabel(date, t) {
  const day = dayjs(date).startOf("day");
  const today = dayjs().startOf("day");
  if (day.isSame(today)) return t("Today");
  if (day.isSame(today.subtract(1, "day"))) return t("Yesterday");
  return day.format("DD/MM/YYYY");
}

// Uma notificação: por ler destaca-se (barra e ícone turquesa, título a negrito); lida fica discreta
function NotificationCard({ n, onRead, busy, t }) {
  const unread = !n.is_read;
  return (
    <article
      className={`relative flex gap-3 sm:gap-4 overflow-hidden rounded-[10px] border p-4 sm:p-5 transition-shadow ${unread ? "border-[#00B9D6]/50 bg-white shadow-[0_4px_14px_rgba(0,185,214,0.16)]" : "border-[#E3E8F2] bg-white/70"}`}
      aria-label={unread ? t("unread") : t("Read")}>
      {unread && <span className="absolute inset-y-0 left-0 w-1 bg-[#00B9D6]" aria-hidden="true" />}
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[18px] ${unread ? "bg-[#00B9D6] text-white" : "bg-[#EEF2F9] text-[#8B9CC3]"}`} aria-hidden="true">
        {unread ? <LuBellRing /> : <LuBell />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className={`font-ryker wrap-break-word text-[15px] text-[#163986] sm:text-[17px] ${unread ? "font-bold" : "font-semibold"}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(n.title) }} />
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-[#8B9CC3]" title={dayjs(n.created_at).format("DD/MM/YYYY HH:mm")}>
            <LuClock aria-hidden="true" /> {dayjs(n.created_at).format("HH:mm")}
          </span>
        </div>
        <div className="prose-content mt-2 wrap-break-word text-[13px] leading-relaxed text-[#163986]/90 sm:text-[14px]" dangerouslySetInnerHTML={{ __html: sanitizeHtml(n.description) }} />
        {unread && (
          <Button size="small" className="mt-3 border-[#00B9D6]! text-[#163986]!" icon={<LuCheck />} loading={busy} onClick={() => onRead(n)}>
            {t("Mark as read")}
          </Button>
        )}
      </div>
    </article>
  );
}

export default function Notifications() {
  const { user, notifications, setNotifications } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { t } = useTranslation();

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const visible = useMemo(() => (filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications), [notifications, filter]);
  const pageItems = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    getData();
    // Só ao abrir a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.notification.readByUser, { params: { id_user: user.id } })
      .then((res) => setNotifications(res.data))
      .catch((err) => console.log(err))
      .finally(() => setIsLoading(false));
  }

  function markAsRead(item) {
    setBusyId(item.id);
    axios
      .post(endpoints.notification.markAsRead, { data: { id: item.id, is_read: 1 } })
      .then(() => setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: 1 } : n))))
      .catch((err) => console.log(err))
      .finally(() => setBusyId(null));
  }

  function markAllAsRead() {
    setIsMarkingAll(true);
    axios
      .post(endpoints.notification.markAllAsRead)
      .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 }))))
      .catch((err) => console.log(err))
      .finally(() => setIsMarkingAll(false));
  }

  return (
    // flex-1: ocupa a altura toda do Content (coluna flex do layout), sem faixa branca por baixo
    <div className="flex-1 bg-[#EAEAEA] py-4 sm:py-8 lg:py-10">
      <div className="page-frame">
        <div className="rounded-[5px] bg-[#F7F7F7] p-4 shadow-lg sm:p-6 lg:p-10">
          <div className="mx-auto w-full max-w-275">
            {/* Cabeçalho: título, quantas por ler e o que se pode fazer em conjunto */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#C5CEE1] pb-4 sm:pb-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#163986] text-[20px] text-white sm:h-12 sm:w-12 sm:text-[22px]">
                  <LuBell aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="font-ryker m-0 text-[20px] font-bold text-[#163986] sm:text-[24px]">{t("Notifications")}</h1>
                  {notifications.length > 0 && (
                    <p className="m-0 text-[12px] text-[#8B9CC3] sm:text-[13px]">{unreadCount > 0 ? `${unreadCount} ${t("unread")}` : t("All caught up")}</p>
                  )}
                </div>
              </div>
              {unreadCount > 0 && (
                <Button className="main-secondary-cta-button" icon={<LuCheckCheck />} loading={isMarkingAll} onClick={markAllAsRead}>
                  {t("Mark all as read")}
                </Button>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="pt-4 sm:pt-5">
                <Segmented
                  value={filter}
                  onChange={(value) => {
                    setFilter(value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: `${t("All")} (${notifications.length})`, value: "all" },
                    { label: `${t("Unread")} (${unreadCount})`, value: "unread" },
                  ]}
                />
              </div>
            )}

            {isLoading && notifications.length === 0 ? (
              <div className="pt-6">
                <Skeleton active avatar paragraph={{ rows: 2 }} />
                <Skeleton active avatar paragraph={{ rows: 2 }} />
              </div>
            ) : pageItems.length > 0 ? (
              <div className="flex flex-col gap-3 pt-4 sm:gap-4 sm:pt-5">
                {pageItems.map((n, index) => {
                  const showDay = index === 0 || dayLabel(n.created_at, t) !== dayLabel(pageItems[index - 1].created_at, t);
                  return (
                    <div key={n.id} className="flex flex-col gap-2">
                      {showDay && <p className={`m-0 text-[12px] font-semibold uppercase tracking-wide text-[#8B9CC3] ${index === 0 ? "" : "mt-2"}`}>{dayLabel(n.created_at, t)}</p>}
                      <NotificationCard n={n} onRead={markAsRead} busy={busyId === n.id} t={t} />
                    </div>
                  );
                })}
                {visible.length > PAGE_SIZE && (
                  <Pagination className="mt-2! self-center" total={visible.length} current={currentPage} onChange={setCurrentPage} pageSize={PAGE_SIZE} showSizeChanger={false} />
                )}
              </div>
            ) : (
              // Estado vazio (sem notificações, ou nenhuma por ler neste filtro)
              <div className="flex flex-col items-center py-10 text-center sm:py-16">
                <span className="mb-4 grid h-16 w-16 place-items-center rounded-full border border-[#C5CEE1] bg-[#F1F9FF] text-[28px] text-[#8B9CC3] sm:h-20 sm:w-20 sm:text-[34px]">
                  <LuBellOff aria-hidden="true" />
                </span>
                <p className="font-ryker m-0 text-[16px] font-semibold text-[#163986] sm:text-[18px]">{filter === "unread" ? t("You have no unread notifications") : t("You have no notifications")}</p>
                <p className="mt-1 text-[13px] text-[#8B9CC3] sm:text-[14px]">{t("New notifications will appear here.")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
