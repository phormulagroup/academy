import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";
import { RxReload } from "react-icons/rx";

import Table from "../../../components/table";
import Delete from "../../../components/delete";
import Create from "../../../components/certificate/create";
import Logs from "../../../components/logs";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function Certificate() {
  const { user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenLogs, setIsOpenLogs] = useState(false);

  const { t } = useTranslation();

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course_certificate.read)
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
                    onClick: () => navigate(`/admin/certificate/${array[i].id}`),
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

  function openDelete(data) {
    setSelectedData(data);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    console.log(c);
    if (c) {
      getData();
    }

    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} table="course_certificate" />
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="course" />
      <Logs table={"course"} id_client={selectedData.id} open={isOpenLogs} close={() => setIsOpenLogs(false)} />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Courses")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
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
