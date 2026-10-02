import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Pagination, Spin } from "antd";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  LuBell,
  LuBellOff,
  LuBellRing,
  LuCalendarDays,
  LuCheckCheck,
  LuClock,
} from "react-icons/lu";

export default function Notifications() {
  const { user, notifications, setNotifications } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const { t } = useTranslation();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.notification.readByUser, { params: { id_user: user.id } })
      .then((res) => {
        setNotifications(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function markAsRead(item) {
    setIsLoading(true);
    axios
      .post(endpoints.notification.markAsRead, {
        data: { id: item.id, is_read: 1 },
      })
      .then(() => {
        let newNotificationsArr = Object.assign([], notifications);
        let findIndex = newNotificationsArr.findIndex((n) => n.id === item.id);
        if (findIndex > -1) {
          newNotificationsArr[findIndex] = {
            ...newNotificationsArr[findIndex],
            is_read: 1,
          };
          setNotifications(newNotificationsArr);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function changePage(page) {
    setCurrentPage(page);
  }

  return (
    // flex-1: ocupa a altura toda do Content (coluna flex do layout), sem faixa branca por baixo
    <div className="flex-1 py-4 sm:py-8 lg:py-10 bg-[#EAEAEA]">
      <div className="page-frame">
        <div className="bg-[#F7F7F7] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 shadow-lg rounded-[5px]">
          {/* Cabeçalho: ícone, título e número de notificações por ler */}
          <div className="w-full max-w-275 flex flex-wrap items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-[#C5CEE1]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#163986] flex justify-center items-center shrink-0">
                <LuBell className="text-white text-[20px] sm:text-[22px]" />
              </div>
              <p className="font-ryker font-bold text-[20px] sm:text-[24px] text-[#163986]">
                {t("Notifications")}
              </p>
            </div>
            {notifications.length > 0 && (
              <span
                className={`rounded-[5px] px-3 py-1 text-[12px] sm:text-[13px] font-medium ${unreadCount > 0 ? "bg-[#00B9D6] text-white" : "bg-[#C5CEE1] text-[#163986]"}`}>
                {unreadCount > 0
                  ? `${unreadCount} ${t("unread")}`
                  : t("All caught up")}
              </span>
            )}
          </div>

          <Spin spinning={isLoading} wrapperClassName="w-full max-w-275">
            {notifications.length > 0 ? (
              <div className="w-full flex flex-col items-center gap-3 sm:gap-4 pt-4 sm:pt-6">
                {notifications
                  .slice(
                    (currentPage - 1) * pageSize,
                    (currentPage - 1) * pageSize + pageSize,
                  )
                  .map((n) => (
                    <div
                      key={n.id}
                      className={`w-full flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-[5px] border shadow-[0px_3px_6px_#00000029] ${n.is_read ? "bg-white border-[#C5CEE1]" : "bg-[#F1F9FF] border-[#00B9D6] border-l-4"}`}>
                      <div
                        className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 ${n.is_read ? "bg-[#C5CEE1]" : "bg-[#00B9D6]"}`}>
                        {n.is_read ? (
                          <LuBellOff className="text-[18px] text-[#163986]" />
                        ) : (
                          <LuBellRing className="text-[18px] text-white" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div
                            className="font-ryker font-semibold text-[16px] sm:text-[18px] text-[#163986] wrap-break-word min-w-0"
                            dangerouslySetInnerHTML={{ __html: n.title }}
                          />
                          {n.is_read ? (
                            <span className="flex items-center gap-1 text-[12px] text-[#8B9CC3] shrink-0">
                              <LuCheckCheck /> {t("Read")}
                            </span>
                          ) : (
                            <Button
                                size="small"
                                className="shrink-0 self-start border-[#00B9D6]! text-[#163986]!"
                                icon={<LuCheckCheck />}
                                onClick={() => markAsRead(n)}>
                                {t("Mark as read")}
                              </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] sm:text-[13px] text-[#8B9CC3]">
                          <span className="flex items-center gap-1">
                            <LuCalendarDays />
                            {dayjs(n.created_at).format("DD/MM/YYYY")}
                          </span>
                          <span className="flex items-center gap-1">
                            <LuClock />
                            {dayjs(n.created_at).format("HH:mm")}
                          </span>
                        </div>
                        <div
                          className="mt-3 text-[14px] text-[#163986] wrap-break-word"
                          dangerouslySetInnerHTML={{ __html: n.description }}
                        />
                      </div>
                    </div>
                  ))}
                {notifications.length > pageSize && (
                  <Pagination
                    className="mt-4! sm:mt-6!"
                    total={notifications.length}
                    current={currentPage}
                    onChange={(page) => changePage(page)}
                    pageSize={pageSize}
                  />
                )}
              </div>
            ) : (
              // Estado vazio
              <div className="w-full flex flex-col items-center text-center py-10 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#F1F9FF] border border-[#C5CEE1] flex justify-center items-center mb-4">
                  <LuBellOff className="text-[28px] sm:text-[34px] text-[#8B9CC3]" />
                </div>
                <p className="font-ryker font-semibold text-[16px] sm:text-[18px] text-[#163986]">
                  {t("You have no notifications")}
                </p>
                <p className="mt-1 text-[13px] sm:text-[14px] text-[#8B9CC3]">
                  {t("New notifications will appear here.")}
                </p>
              </div>
            )}
          </Spin>
        </div>
      </div>
    </div>
  );
}
