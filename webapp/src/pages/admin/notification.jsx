import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button, Tag } from "antd";
import { FaArrowAltCircleRight, FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/notification/create";
import Update from "../../components/admin/notification/update";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";

export default function Notification() {
  const { selectedLanguage, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("notification");
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
            <RowActions items={[
                  {
                    label: t("Send"),
                    key: `${array[i].id}-send`,
                    icon: <FaArrowAltCircleRight />,
                    onClick: () => sendNotification(array[i]),
                  },
                  perm.canUpdate && {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  perm.canDelete && {
                    label: t("Delete"),
                    key: `${array[i].id}-delete`,
                    icon: <FaRegTrashAlt />,
                    onClick: () => openDelete(array[i]),
                  },
                ]} />
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
      .then(() => {
        toastApi.success(t("Notification sent successfully"));
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Something went wrong, please try again"));
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
          <p className="text-xl font-bold font-ryker">{t("Notifications")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} notifications", { total: tableData.length })}</p>
        </div>
        <div>
          <ExportButton table="notifications" data={tableData.map((r) => r.full_data)} columns={[{ title: "ID", dataIndex: "id" }, { title: "Title", dataIndex: "title" }, { title: "Type", dataIndex: "type" }, languageColumn, { title: "Country", dataIndex: "country" }, createdColumn]} />
          <RefreshButton size="large" onClick={getData} className="mr-2" />
          {perm.canCreate && (<Button size="large" onClick={() => setIsOpenCreate(true)} icon={<AiOutlinePlus />}>
            {t("Add notification")}
          </Button>)}
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        columns={[
          {
            title: t("Title"),
            dataIndex: "title",
            key: "title",
          },
          {
            title: t("Description"),
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
