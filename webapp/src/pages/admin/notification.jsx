import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
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

export default function Notification() {
  const { selectedLanguage, notificationApi } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenTranslations, setIsOpenTranslations] = useState(false);

  useEffect(() => {
    getData();
  }, [selectedLanguage.id]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.notification.readByLang, { params: { id_lang: selectedLanguage.id } })
      .then((res) => {
        setData(res.data);
        prepareData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function prepareData(array) {
    const aux = [];
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        key: i + 1,
        title: <div dangerouslySetInnerHTML={{ __html: array[i].title }}></div>,
        description: <div dangerouslySetInnerHTML={{ __html: array[i].description }}></div>,
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <Dropdown
              trigger={"click"}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    label: "Send",
                    key: `${array[i].id}-send`,
                    icon: <FaArrowAltCircleRight />,
                    onClick: () => sendNotification(array[i]),
                  },
                  {
                    label: "Update",
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  {
                    label: "Delete",
                    key: `${array[i].id}-delete`,
                    icon: <FaRegTrashAlt />,
                    onClick: () => openDelete(array[i]),
                  },
                ],
              }}
            >
              <Button>
                <IoMdMore />
              </Button>
            </Dropdown>
          </div>
        ),
      });
    }

    setTableData(aux);
  }

  function sendNotification(obj) {
    console.log(obj);
    axios
      .post(endpoints.notification.send, {
        data: obj,
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
  }

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    console.log(c);
    if (c) {
      getData();
    }
    setIsOpenUpdate(false);
    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} />
      <Update data={selectedData} open={isOpenUpdate} close={closeAction} />
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="language" />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Notifications")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
          <Button size="large" onClick={() => setIsOpenCreate(true)} icon={<AiOutlinePlus />}>
            {t("Add notification")}
          </Button>
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        columns={[
          {
            title: "Title",
            dataIndex: "title",
            key: "title",
          },
          {
            title: "Description",
            dataIndex: "description",
            key: "description",
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
            width: "80px",
          },
        ]}
      />
    </div>
  );
}
