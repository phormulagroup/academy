import axios from "axios";
import { useContext, useEffect } from "react";
import RowActions from "../../../components/admin/rowActions";
import { useState } from "react";
import { Button, Tag } from "antd";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import useListFilters, { includesText } from "../../../components/admin/listFilters";
import TemplateUpdate from "../../../components/admin/template/update";
import Delete from "../../../components/admin/delete";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";

import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import { useNavigate } from "react-router-dom";
import Create from "../../../components/admin/template/create";

export default function Template() {
  const { selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.email.readByLang, {
        params: { id_lang: selectedLanguage.id },
      })
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
            <img src={array[i].flag} className="max-w-5" />
          </div>
        ),
        is_active: array[i].is_active ? (
          <Tag variant="outlined" color={"green"}>
            {t("Active")}
          </Tag>
        ) : (
          <Tag variant="outlined" color={"red"}>
            {t("Inactive")}
          </Tag>
        ),
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <RowActions items={[
                  {
                    label: t("Update"),
                    key: `${array[i].id}-update`,
                    icon: <FaRegEdit />,
                    onClick: () => openUpdate(array[i]),
                  },
                  {
                    label: t("Details"),
                    key: `${array[i].id}-details`,
                    icon: <FaRegFile />,
                    onClick: () => navigate(`/admin/templates/${array[i].id}`),
                  },
                  {
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

    setIsOpenDelete(false);
    setIsOpenCreate(false);
    setIsOpenUpdate(false);
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "name", type: "text", primary: true, placeholder: t("Search by name..."), match: (row, v) => includesText(row.full_data.name, v) },
    { key: "active", type: "select", primary: true, label: t("Is active"), options: [{ label: t("Yes"), value: 1 }, { label: t("No"), value: 0 }], match: (row, v) => (row.full_data.is_active ? 1 : 0) === v },
  ]);

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} />
      <TemplateUpdate
        data={selectedData}
        open={isOpenUpdate}
        close={closeAction}
      />
      <Delete
        data={selectedData}
        open={isOpenDelete}
        close={closeAction}
        table="email"
      />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Templates")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <Button
            size="large"
            onClick={getData}
            icon={<RxReload />}
           
          />
          <Button size="large" onClick={() => setIsOpenCreate(true)}>
            {t("Add template")}
          </Button>
        </div>
      </div>
      <Table
        dataSource={filterRows(tableData)}
        loading={isLoading}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sort: true,
            sortType: "text",
            width: "80%",
          },
          {
            title: t("Is active"),
            dataIndex: "is_active",
            key: "is_active",
            width: "40px",
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
