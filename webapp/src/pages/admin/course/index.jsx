import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/table";
import Create from "../../../components/course/create";
import Update from "../../../components/course/update";
import Delete from "../../../components/delete";
import Logs from "../../../components/logs";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function Course() {
  const { user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenLogs, setIsOpenLogs] = useState(false);

  const { t } = useTranslation();

  const navigate = useNavigate();

  useEffect(() => {
    if (user) getData();
  }, [user]);

  function getData() {
    setIsLoading(true);
    console.log(user);
    axios
      .get(endpoints.course.read, {
        params: { id_user: user.id },
      })
      .then((res) => {
        console.log(res.data);
        setData(res.data.courses);
        prepareData(res.data.courses);
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
        is_deleted: array[i].is_deleted ? (
          <Tag variant="outlined" color={"#F04C4B"}>
            Inativo
          </Tag>
        ) : (
          <Tag variant="outlined" color={"#06D186"}>
            Ativo
          </Tag>
        ),
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <Dropdown
              trigger={"click"}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    label: t("Details"),
                    key: `${array[i].id}-details`,
                    icon: <FaRegEdit />,
                    onClick: () => navigate(`/admin/course/${array[i].id}`),
                  },
                  {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
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

  function openLogs(obj) {
    setSelectedData(obj);
    setIsOpenLogs(true);
  }

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
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
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="course" />
      <Logs table={"course"} id_client={selectedData.id} open={isOpenLogs} close={() => setIsOpenLogs(false)} />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Courses")}</p>
        </div>
        <div>
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
            width: "80%",
          },
          (user.id_role === 1 || user.id_role === 2) && {
            title: "Estado",
            dataIndex: "is_deleted",
            key: "is_deleted",
            filters: [
              { text: "Ativo", value: 0 },
              { text: "Inativo", value: 1 },
            ],
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
