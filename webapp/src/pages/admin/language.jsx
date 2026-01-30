import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/table";
import Create from "../../components/language/create";
import Update from "../../components/language/update";
import Delete from "../../components/delete";
import Logs from "../../components/logs";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import Translations from "../../components/language/translations";
import { useTranslation } from "react-i18next";

export default function Language() {
  const { user } = useContext(Context);
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
      .get(endpoints.language.read)
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
        flag: (
          <div className="flex justify-start items-center">
            <img src={array[i].flag} className="max-w-[20px]" />
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
                  array[i].is_default !== 1 && {
                    label: "Translations",
                    key: `${array[i].id}-translations`,
                    icon: <FaRegFile />,
                    onClick: () => openTranslations(array[i]),
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

  function openTranslations(obj) {
    setSelectedData(obj);
    setIsOpenTranslations(true);
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
      <Translations data={selectedData} defaultLanguage={data.filter((item) => item.is_default === 1)[0]} open={isOpenTranslations} close={() => setIsOpenTranslations(false)} />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Translations")}</p>
        </div>
        <div>
          <Button size="large" onClick={() => setIsOpenCreate(true)} icon={<AiOutlinePlus />}>
            {t("Add Language")}
          </Button>
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        columns={[
          {
            title: "",
            dataIndex: "flag",
            key: "flag",
            width: "40px",
          },
          {
            title: "Nome",
            dataIndex: "name",
            key: "name",
            sort: true,
            sortType: "text",
            search: "name",
            width: "80%",
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
