import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/product/create";
import Update from "../../components/admin/product/update";
import Delete from "../../components/admin/delete";
import StatusTag from "../../utils/statusTag";
import { uniqueRule } from "../../utils/formFieldError";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";

export default function Product() {
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
      .get(endpoints.product.read)
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
        is_deleted: <StatusTag isDeleted={array[i].is_deleted} />,
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
              }}>
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

  // Nome único (usado pelo Create e pelo Update): não pode existir outro produto ativo com o mesmo nome;
  // no Update ignora o próprio produto (excludeId)
  const nameRule = (excludeId = null) =>
    uniqueRule(data, t("A product with this name already exists"), {
      excludeId,
    });

  function closeAction(c) {
    if (c) {
      getData();
    }
    setIsOpenUpdate(false);
    setIsOpenCreate(false);
    setIsOpenDelete(false);
    setIsOpenTranslations(false);
  }

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} nameRule={nameRule} />
      <Update
        data={selectedData}
        open={isOpenUpdate}
        close={closeAction}
        nameRule={nameRule}
      />
      <Delete
        data={selectedData}
        open={isOpenDelete}
        close={closeAction}
        table="product"
      />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("Products")}</p>
        </div>
        <div>
          <Button
            size="large"
            onClick={getData}
            icon={<RxReload />}
            className="mr-2"
          />
          <Button
            size="large"
            onClick={() => setIsOpenCreate(true)}
            icon={<AiOutlinePlus />}>
            {t("Add product")}
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
            width: "50%",
          },
          {
            title: t("Status"),
            dataIndex: "is_deleted",
            key: "is_deleted",
            width: "150px",
            filters: [
              { text: t("Active"), value: 0 },
              { text: t("Inactive"), value: 1 },
            ],
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
