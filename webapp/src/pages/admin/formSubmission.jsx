import axios from "axios";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../components/admin/rowActions";
import { useState } from "react";
import { Button, Image, Tag } from "antd";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import useListFilters, { includesText } from "../../components/admin/listFilters";
import Create from "../../components/admin/faqs/create";
import Update from "../../components/admin/faqs/update";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import config from "../../utils/config";
import i18n from "../../utils/i18n";

export default function FormSubmission() {
  const { user, selectedLanguage } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("form_submission");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenTranslations, setIsOpenTranslations] = useState(false);

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.form.readByLang, { params: { id_lang: selectedLanguage.id } })
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
      let images = array[i].images ? JSON.parse(array[i].images) : [];

      aux.push({
        ...array[i],
        key: i + 1,
        message: <div className="max-w-[400px] whitespace-pre-wrap">{array[i].message}</div>,
        full_data: array[i],
        actions: (
          <div className="flex justify-end items-center">
            <RowActions items={[
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

  function openDelete(obj) {
    setSelectedData(obj);
    setIsOpenDelete(true);
  }

  function closeAction(c) {
    if (c) {
      getData();
    }
    setIsOpenDelete(false);
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "subject", type: "text", primary: true, placeholder: t("Search by subject..."), match: (row, v) => includesText(row.full_data.subject, v) },
    { key: "name", type: "text", label: t("Name"), placeholder: t("Search by name..."), match: (row, v) => includesText(row.full_data.name, v) },
    { key: "email", type: "text", label: t("E-mail"), placeholder: t("Search by e-mail..."), match: (row, v) => includesText(row.full_data.email, v) },
  ]);

  return (
    <div className="p-2">
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="form" />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold">{t("Form Submissions")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} submissions", { total: filterRows(tableData).length })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <ExportButton table="answers" data={filterRows(tableData).map((r) => r.full_data)} columns={[{ title: "ID", dataIndex: "id" }, { title: "Subject", dataIndex: "subject" }, { title: "Name", dataIndex: "name" }, { title: "E-mail", dataIndex: "email" }, { title: "Message", dataIndex: "message" }, languageColumn, createdColumn]} />
          <RefreshButton size="large" onClick={getData} />
        </div>
      </div>
      <Table
        dataSource={filterRows(tableData)}
        loading={isLoading}
        columns={[
          {
            title: t("Subject"),
            dataIndex: "subject",
            key: "subject",
            sort: true,
            sortType: "text",
            width: "400px",
          },
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
          },
          {
            title: t("E-mail"),
            dataIndex: "email",
            key: "email",
          },
          {
            title: t("Message"),
            dataIndex: "message",
            key: "message",
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
