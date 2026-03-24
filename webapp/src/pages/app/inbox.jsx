import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Avatar, Button, Dropdown, Empty, Pagination, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaArrowAltCircleRight, FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Create from "../../components/app/inbox/create";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import NotificationIcon from "../../assets/Notifications-off.svg?react";
import CalendarIcon from "../../assets/Backoffice/calendar.svg?react";
import Message from "../../components/message";

export default function Inbox() {
  const { selectedLanguage, notificationApi, user, inbox, setInbox, selectedInbox, setSelectedInbox } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenDetails, setIsOpenDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(user.id_role === 1 ? endpoints.inbox.readBySupport : endpoints.inbox.readByUser, { params: { id_user: user.id } })
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

  function openDetails(d) {
    setSelectedInbox(d);
    setIsOpenDetails(true);
  }

  function closeAction(c) {
    console.log(c);
    if (c) {
      getData();
    }
    setSelectedInbox({});
    setIsOpenDetails(false);
    setIsOpenCreate(false);
  }

  return (
    <div className="p-10 bg-[#EAEAEA] min-h-full">
      <Message open={isOpenDetails} close={closeAction} />
      <Create open={isOpenCreate} close={closeAction} />
      <div className="container m-auto">
        <div className="bg-[#F7F7F7] flex flex-col justify-center items-center p-10 shadow-lg rounded-[5px]">
          <div className="grid grid-cols-3 w-full mb-2">
            <div></div>
            <p className="text-center font-bold text-2xl mb-4">{t("Inbox")}</p>
            {user.id_role !== 1 && (
              <div className="flex justify-end items-center w-full">
                <Button size="large">Create thread</Button>
              </div>
            )}
          </div>
          {inbox.length > 0 ? (
            <div className="w-full flex flex-col justify-center items-center">
              {inbox.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize).map((m) => (
                <div className="bg-white p-4 shadow-[0px_3px_6px_#00000029] rounded-[5px] flex flex-col w-full">
                  <div className="grid grid-cols-4 gap-8 pb-4 border-b border-[#E8E9F3]">
                    <div className="col-span-3 flex items-center">
                      <p className="font-bold text-[16px]">{m.title}</p>
                    </div>
                    <div className="flex justify-end items-center">
                      <Tag color={"green"} variant="outlined" className="mr-2!">
                        {t(`${m.status}`)}
                      </Tag>
                      {m.unread_messages > 0 && (
                        <div className="w-8 h-8 bg-[#00B9D6] flex justify-center items-center mr-2">
                          <p className="text-white text-[14px]">{m.unread_messages}</p>
                        </div>
                      )}
                      <Avatar />
                      <p className="ml-2">{m.user_name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 pt-4 pb-4 border-b border-[#E8E9F3]">
                    <div className="col-span-3">
                      <p className="font-bold">{t("Message")}</p>
                      <div dangerouslySetInnerHTML={{ __html: m.text }} />
                    </div>
                    <div className="flex justify-end items-center">
                      <div className="flex justify-start items-center">
                        <p className="mr-4">{t("Last message")}: </p>
                        <CalendarIcon className="max-w-3.75" />
                        <p className="ml-1">{dayjs(m.created_at).format("DD/MM/YYYY")}</p>
                      </div>
                      <div className="ml-4">
                        <div className="flex justify-start items-center">
                          <CalendarIcon className="max-w-3.75" />
                          <p className="ml-2">{dayjs(m.created_at).format("HH:mm")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 grid grid-cols-4">
                    <div className="col-span-3 flex justify-start items-center">
                      <p className="mr-4">{t("Initiated at")}: </p>
                      <CalendarIcon className="max-w-3.75" />
                      <p className="ml-2">{dayjs(m.initiated_at).format("DD/MM/YYYY")}</p>
                    </div>
                    <div className="flex justify-end items-center">
                      <Button onClick={() => openDetails(m)}>{t("Respond")}</Button>
                    </div>
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
