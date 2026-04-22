import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/download/create";
import Update from "../../components/admin/download/update";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import config from "../../utils/config";

export default function Download() {
  const { user, selectedLanguage } = useContext(Context);
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
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.download.readByLang, { params: { id_lang: selectedLanguage.id } })
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
        name: array[i].name,
        img: (
          <div className="flex justify-start items-center">
            <img src={`${config.server_ip}/media/${array[i].img}`} className="max-w-[100px] h-auto" />
          </div>
        ),
        is_deleted: array[i].is_deleted ? (
          <Tag variant="outlined" color={"red"}>
            Inativo
          </Tag>
        ) : (
          <Tag variant="outlined" color={"green"}>
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

  function openUpdate(obj) {
    setSelectedData(obj);
    setIsOpenUpdate(true);
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
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="document" />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Downloads")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
          <Button size="large" onClick={() => setIsOpenCreate(true)} icon={<AiOutlinePlus />}>
            {t("Add download")}
          </Button>
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        columns={[
          {
            title: "",
            dataIndex: "thumbnail",
            key: "thumbnail",
            width: "100px",
          },
          {
            title: "Nome",
            dataIndex: "name",
            key: "name",
            sort: true,
            sortType: "text",
            search: "name",
            width: "50%",
          },
          {
            title: "File",
            dataIndex: "file",
            key: "file",
            width: "50%",
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
