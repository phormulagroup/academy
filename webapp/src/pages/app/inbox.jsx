import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Empty, Pagination, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaArrowAltCircleRight, FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Create from "../../components/app/inbox/create";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import NotificationIcon from "../../assets/Notifications-off.svg?react";

export default function Inbox() {
  const { selectedLanguage, notificationApi, user, inbox, setInbox } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.inbox.read, { params: { id_user: user.id } })
      .then((res) => {
        console.log(res);
        setInbox(res.data);
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

  function closeCreate(a) {
    if (a) getData();
    setIsOpenCreate(false);
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <Create open={isOpenCreate} close={closeCreate} />
      <div className="container m-auto">
        <div className="bg-[#F7F7F7] flex flex-col justify-center items-center p-10 shadow-lg rounded-[5px]">
          <div className="grid grid-cols-3 w-full">
            <div></div>
            <p className="text-center font-bold text-2xl mb-4">{t("Inbox")}</p>
            <div className="flex justify-end items-center w-full">
              <Button size="large">Create thread</Button>
            </div>
          </div>
          {inbox.length > 0 ? (
            <div className="w-full flex flex-col justify-center items-center">
              {inbox.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize).map((n) => (
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
                </div>
              ))}
              {inbox.length > 5 && (
                <Pagination className="mt-8!" total={inbox.length} current={currentPage} onChange={(page, pageSize) => changePage(page, pageSize)} pageSize={pageSize} />
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
