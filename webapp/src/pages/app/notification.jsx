import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Empty, Tag } from "antd";
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

export default function Notifications() {
  const { selectedLanguage, notificationApi, user, notifications, setNotifications } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <div className="container m-auto">
        <div className="bg-[#F7F7F7] flex flex-col justify-center items-center p-10 shadow-lg">
          <p className="text-center font-bold text-2xl mb-4">{t("Notifications")}</p>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div className="mt-4 flex gap-4 p-6 bg-white border border-[#707070] max-w-275 w-full">
                <div className="w-10">
                  <div className="bg-[#00B9D6] w-10 h-10 rounded-full flex justify-center items-center">
                    <NotificationIcon className="invert-[1] brightness-[0]" />
                  </div>
                </div>
                <div className="flex flex-col w-[calc(100%-40px)]">
                  <div className="text-[18px]" dangerouslySetInnerHTML={{ __html: n.title }} />
                  <p className="mt-2  text-[#707070]">{dayjs(n.created_at).format("DD MMMM, YYYY HH:mm")}</p>
                  <div className="mt-4 text-[14px]" dangerouslySetInnerHTML={{ __html: n.description }} />
                </div>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </div>
      </div>
    </div>
  );
}
