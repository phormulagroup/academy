import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Avatar, Button, Dropdown, Empty, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import Translations from "../../components/admin/language/translations";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import dayjs from "dayjs";
import CalendarIcon from "../../assets/Backoffice/calendar.svg?react";
import SettingsIcon from "../../assets/Backoffice/settings.svg?react";
import Message from "../../components/message";
import { CgClose } from "react-icons/cg";

export default function Inbox() {
  const { user, setSelectedInbox, createLog, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  const [isOpenDetails, setIsOpenDetails] = useState(false);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.inbox.readBySupport, { params: { id_user: user.id } })
      .then((res) => {
        console.log(res);
        setData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
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
  }

  async function closeThread(obj) {
    try {
      const res = await axios.post(endpoints.inbox.close, { data: obj });
      if (res.data.affectedRows > 0) {
        await createLog({ id_user: user.id, action: "status", table_name: "inbox", meta_data: JSON.stringify({ ...obj, status: "closed" }), id_lang: selectedLanguage.id });
        setData((prev) => prev.map((p) => (p.id === obj.id ? { ...p, status: "closed" } : p)));
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="p-2">
      <Message open={isOpenDetails} close={closeAction} />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Inbox")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
        </div>
      </div>

      {data.length > 0 ? (
        data.map((m) => (
          <div className="bg-white p-4 shadow-[0px_3px_6px_#00000029] rounded-[5px] flex flex-col mb-4">
            <div className="grid grid-cols-4 gap-8 pb-4 border-b border-[#E8E9F3]">
              <div className="col-span-3 flex items-center">
                <p className="font-bold text-[16px]">{m.title}</p>
              </div>
              <div className="flex justify-end items-center">
                <Tag color={"green"} variant="outlined" className="mr-2!">
                  {t(`${m.status}`)}
                </Tag>
                <Avatar />
                <p className="ml-2">{m.user_name}</p>

                <Dropdown
                  trigger={"click"}
                  placement="bottomRight"
                  menu={{
                    items: [
                      {
                        label: t("Close"),
                        key: `${m.id}-close`,
                        icon: <CgClose />,
                        onClick: () => closeThread(m),
                      },
                    ],
                  }}
                >
                  <SettingsIcon className="ml-2! max-w-5 cursor-pointer" />
                </Dropdown>
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
        ))
      ) : (
        <Empty />
      )}
    </div>
  );
}
