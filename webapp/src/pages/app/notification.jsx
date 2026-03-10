import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Empty, Pagination, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaArrowAltCircleRight, FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/notification/create";
import Update from "../../components/admin/notification/update";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import dayjs from "dayjs";
import NotificationIcon from "../../assets/Notifications-off.svg?react";
import { RiCloseCircleLine } from "react-icons/ri";

export default function Notifications() {
  const { selectedLanguage, notificationApi, user, notifications, setNotifications } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.notification.readByUser, { params: { id_user: user.id } })
      .then((res) => {
        console.log(res);
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
      .post(endpoints.notification.markAsRead, { data: { id: item.id, is_read: 1 } })
      .then((res) => {
        let newNotificationsArr = Object.assign([], notifications);
        let findIndex = newNotificationsArr.findIndex((n) => n.id === item.id);
        if (findIndex > -1) {
          newNotificationsArr[findIndex] = { ...newNotificationsArr[findIndex], is_read: 1 };
          setNotifications(newNotificationsArr);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function changePage(page, pageSize) {
    setCurrentPage(page);
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <div className="container m-auto">
        <div className="bg-[#F7F7F7] flex flex-col justify-center items-center p-10 shadow-lg">
          <p className="text-center font-bold text-2xl mb-4">{t("Notifications")}</p>
          {notifications.length > 0 ? (
            <div className="w-full flex flex-col justify-center items-center">
              {notifications.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize).map((n) => (
                <div className="mt-4 flex gap-4 p-6 bg-white border border-[#707070] max-w-275 w-full">
                  <div className="w-10">
                    <div className={`${n.is_read ? "bg-gray-400" : "bg-[#00B9D6]"} w-10 h-10 rounded-full flex justify-center items-center`}>
                      <NotificationIcon className="invert-[1] brightness-[0]" />
                    </div>
                  </div>
                  <div className="flex flex-col w-[calc(100%-40px)]">
                    <div className="text-[18px]" dangerouslySetInnerHTML={{ __html: n.title }} />
                    <p className="mt-2  text-[#707070]">{dayjs(n.created_at).format("DD MMMM, YYYY HH:mm")}</p>
                    <div className="mt-4 text-[14px]" dangerouslySetInnerHTML={{ __html: n.description }} />
                  </div>
                  <RiCloseCircleLine className="text-[24px] cursor-pointer" onClick={() => markAsRead(n)} />
                </div>
              ))}
              {notifications.length > 5 && (
                <Pagination className="mt-8!" total={notifications.length} current={currentPage} onChange={(page, pageSize) => changePage(page, pageSize)} pageSize={pageSize} />
              )}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      </div>
    </div>
  );
}
