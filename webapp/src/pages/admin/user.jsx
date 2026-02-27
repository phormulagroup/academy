import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
import { IoMdMore, IoMdRefresh } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/user/create";
import Update from "../../components/admin/user/update";
import Logs from "../../components/admin/logs";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { RxSwitch } from "react-icons/rx";
import { useTranslation } from "react-i18next";
import Status from "../../components/admin/user/status";

export default function User() {
  const { user } = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenStatus, setIsOpenStatus] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenLogs, setIsOpenLogs] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    if (user.id_role === 1 || user.id_role === 2) getData();
  }, [user]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.user.read)
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
    console.log(array);
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        key: array[i].id,
        status_tag:
          array[i].status === "approved" ? (
            <Tag variant="outlined" color={"#06D186"}>
              {array[i].status}
            </Tag>
          ) : array[i].status === "denied" ? (
            <Tag variant="outlined" color={"#F04C4B"}>
              {array[i].status}
            </Tag>
          ) : array[i].status === "pending" ? (
            <Tag variant="outlined" color={"#FF963B"}>
              {array[i].status}
            </Tag>
          ) : null,
        actions: (
          <div className="flex justify-end items-center">
            <Dropdown
              trigger={"click"}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    label: t("Change status"),
                    key: `${array[i].id}-status`,
                    icon: <RxSwitch />,
                    onClick: () => openStatus(array[i]),
                  },
                  {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  {
                    label: t("Logs"),
                    key: `${array[i].id}-logs`,
                    icon: <FaRegFile />,
                    onClick: () => openLogs(array[i]),
                  },
                  {
                    label: t("Delete"),
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

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
  }

  function openStatus(obj) {
    setSelectedData(obj);
    setIsOpenStatus(true);
  }

  function openLogs(obj) {
    setSelectedData(obj);
    setIsOpenLogs(true);
  }

  function openDelete() {
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    if (c) {
      getData();
    }
    setIsOpenCreate(false);
    setIsOpenUpdate(false);
    setIsOpenDelete(false);
    setIsOpenStatus(false);
    setIsOpenLogs(false);
  }

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} />
      <Update data={selectedData} open={isOpenUpdate} close={closeAction} />
      <Status data={selectedData} open={isOpenStatus} close={closeAction} />
      <Logs table={"project"} id_project={selectedData.id} open={isOpenLogs} close={() => setIsOpenLogs(false)} />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">Utilizadores</p>
        </div>
        <div className="flex justify-center">
          <Button size="large" className="mr-2" onClick={() => getData()}>
            <IoMdRefresh />
          </Button>
          <Button size="large" onClick={() => setIsOpenCreate(true)}>
            Adicionar
          </Button>
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        columns={[
          {
            title: "Nome",
            dataIndex: "name",
            key: "name",
            sort: true,
            sortType: "text",
            search: "name",
          },
          {
            title: "E-mail",
            dataIndex: "email",
            key: "email",
            sort: true,
            sortType: "text",
            search: "email",
          },
          {
            title: "Papel",
            dataIndex: "role_name",
            key: "role_name",
            sort: true,
            sortType: "text",
            filters:
              tableData.filter((item) => item.role_name).length > 0
                ? tableData
                    .map((item, index) => (item.role_name ? { text: item.role_name, value: item.role_name } : {}))
                    .filter((value, index, self) => (value.text ? index === self.findIndex((t) => t.value === value.text) : null))
                : null,
          },
          {
            title: "Status",
            dataIndex: "status_tag",
            key: "status_tag",
            sort: true,
            sortType: "text",
            filters:
              tableData.filter((item) => item.status).length > 0
                ? tableData
                    .map((item, index) => (item.status ? { text: item.status, value: item.status } : {}))
                    .filter((value, index, self) => (value.text ? index === self.findIndex((t) => t.value === value.text) : null))
                : null,
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
          },
        ]}
      />
    </div>
  );
}
