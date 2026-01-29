import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown } from "antd";
import { IoMdMore, IoMdRefresh } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/table";
import Create from "../../components/user/create";
import Update from "../../components/user/update";
import Logs from "../../components/logs";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";

export default function User() {
  const { user } = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenLogs, setIsOpenLogs] = useState(false);

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
        department_name: array[i].department_name,
        actions: (
          <div className="flex justify-end items-center">
            <Dropdown
              trigger={"click"}
              placement="bottomRight"
              menu={{
                items: [
                  (user.id_role === 1 || (user.id_role === 2 && array[i].id_role !== 1)) && {
                    label: "Editar",
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  (user.id_role === 1 || user.id_role === 2) && {
                    label: "Histórico de alterações",
                    key: `${array[i].id}-logs`,
                    icon: <FaRegFile />,
                    onClick: () => openLogs(array[i]),
                  },
                  (user.id_role === 1 || (user.id_role === 2 && array[i].id_role !== 1)) && {
                    label: "Apagar",
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

  function closeUpdate(c) {
    if (c) {
      getData();
    }
    setIsOpenUpdate(false);
  }

  function openDelete() {
    setIsOpenDelete(true);
  }

  function closeCreate(c) {
    if (c) {
      getData();
    }
    setIsOpenCreate(false);
  }

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeCreate} />
      <Update data={selectedData} open={isOpenUpdate} close={closeUpdate} />
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
            title: "Departamento",
            dataIndex: "department_name",
            key: "department_name",
            sort: true,
            sortType: "text",
            filters:
              tableData.filter((item) => item.department_name).length > 0
                ? tableData
                    .map((item, index) => (item.department_name ? { text: item.department_name, value: item.department_name } : {}))
                    .filter((value, index, self) => (value.text ? index === self.findIndex((t) => t.value === value.text) : null))
                : null,
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
            title: "",
            dataIndex: "actions",
            key: "actions",
          },
        ]}
      />
    </div>
  );
}
