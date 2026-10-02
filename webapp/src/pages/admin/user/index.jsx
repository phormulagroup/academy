import axios from "axios";
import RefreshButton from "../../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../../components/admin/export/exportButton";
import { LuUpload } from "react-icons/lu";
import { usePermission } from "../../../utils/usePermission";
import { useContext, useEffect } from "react";
import RowActions from "../../../components/admin/rowActions";
import { useState } from "react";
import { Button, Tag } from "antd";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import useListFilters, { includesText } from "../../../components/admin/listFilters";
import Create from "../../../components/admin/user/create";
import Import from "../../../components/admin/import/import";
import Delete from "../../../components/admin/delete";
import Logs from "../../../components/admin/logs";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { RxSwitch } from "react-icons/rx";
import { useTranslation } from "react-i18next";
import Status from "../../../components/admin/user/status";
import UserCell from "../../../components/admin/userCell";
import { useNavigate } from "react-router-dom";

const unique = (values) => [...new Set(values.filter(Boolean))].sort().map((v) => ({ label: v, value: v }));

export default function User() {
  const { user, languages, selectedLanguage } = useContext(Context);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenStatus, setIsOpenStatus] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpenImport, setIsOpenImport] = useState(false);
  const [isOpenLogs, setIsOpenLogs] = useState(false);

  const navigate = useNavigate();

  const { t } = useTranslation();

  const perm = usePermission("user");
  // Rótulos traduzidos dos estados (filtro da coluna Estado)
  const statusLabels = {
    approved: t("Approved"),
    pending: t("Pending"),
    not_approved: t("Not Approved"),
  };

  useEffect(() => {
    getData();
  }, [selectedLanguage]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.user.read)
      .then((res) => {
        const users = res.data.filter(
          (u) => u.id_lang === selectedLanguage?.id,
        );
        setData(users);
        prepareData(users);
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
        deleted: array[i].is_deleted,
        language: languages
          .filter((l) => l.id === array[i].id_lang)[0]
          .code.toUpperCase(),
        country: t(array[i].country),
        // Atividade = coluna is_deleted (0 ativo, 1 inativo); o valor bruto mantém-se para o filtro da tabela
        activity_tag: array[i].is_deleted ? (
          <Tag variant="outlined" color={"#F04C4B"}>
            {t("Inactive")}
          </Tag>
        ) : (
          <Tag variant="outlined" color={"#06D186"}>
            {t("Active")}
          </Tag>
        ),
        status_tag:
          array[i].status === "approved" ? (
            <Tag variant="outlined" color={"#06D186"}>
              {t("Approved")}
            </Tag>
          ) : array[i].status === "not_approved" ? (
            <Tag variant="outlined" color={"#F04C4B"}>
              {t("Not Approved")}
            </Tag>
          ) : array[i].status === "pending" ? (
            <Tag variant="outlined" color={"#FF963B"}>
              {t("Pending")}
            </Tag>
          ) : null,
        actions: (
          <div className="flex justify-end items-center">
            <RowActions items={[
                  {
                    label: t("Change status"),
                    key: `${array[i].id}-status`,
                    icon: <RxSwitch />,
                    onClick: () => openStatus(array[i]),
                  },
                  perm.canUpdate && {
                    label: t("Update"),
                    key: `${array[i].id}-udpate`,
                    icon: <FaRegEdit />,
                    onClick: () => navigate(`/admin/users/${array[i].id}`),
                  },
                  {
                    label: t("Logs"),
                    key: `${array[i].id}-logs`,
                    icon: <FaRegFile />,
                    onClick: () => openLogs(array[i]),
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

  function openStatus(obj) {
    setSelectedData(obj);
    setIsOpenStatus(true);
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
    setIsOpenCreate(false);
    setIsOpenUpdate(false);
    setIsOpenDelete(false);
    setIsOpenStatus(false);
    setIsOpenLogs(false);
    setIsOpenImport(false);
  }

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const { filterRows, toolbar } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by name or e-mail..."), match: (row, v) => includesText(row.name, v) || includesText(row.email, v) },
    { key: "role", type: "select", primary: true, label: t("Role"), options: () => unique(tableData.map((r) => r.role_name)), match: (row, v) => row.role_name === v },
    {
      key: "status",
      type: "select",
      label: t("Status"),
      options: [
        { label: t("Approved"), value: "approved" },
        { label: t("Pending"), value: "pending" },
        { label: t("Not Approved"), value: "not_approved" },
      ],
      match: (row, v) => row.status === v,
    },
    { key: "activity", type: "select", label: t("Activity"), options: [{ label: t("Active"), value: 0 }, { label: t("Inactive"), value: 1 }], match: (row, v) => (row.deleted ? 1 : 0) === v },
    { key: "language", type: "select", label: t("Language"), options: () => unique(tableData.map((r) => r.language)), match: (row, v) => row.language === v },
    { key: "country", type: "select", label: t("Country"), options: () => unique(tableData.map((r) => r.country)), match: (row, v) => row.country === v },
  ]);

  return (
    <div className="p-2">
      <Create open={isOpenCreate} close={closeAction} />
      <Import table="user" open={isOpenImport} close={closeAction} />
      <Status data={selectedData} open={isOpenStatus} close={closeAction} />
      <Delete
        data={selectedData}
        open={isOpenDelete}
        close={closeAction}
        table="user"
      />
      <Logs
        table={"project"}
        id_project={selectedData.id}
        open={isOpenLogs}
        close={() => setIsOpenLogs(false)}
      />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Users")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} users", { total: filterRows(tableData).length })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <RefreshButton size="large" onClick={() => getData()} />
          <ExportButton table="users" data={filterRows(tableData)} columns={[
              { title: "ID", dataIndex: "id" },
              { title: "Name", dataIndex: "name" },
              { title: "E-mail", dataIndex: "email" },
              { title: "Role", dataIndex: "role_name" },
              { title: "Language", dataIndex: "language" },
              { title: "Country", dataIndex: "country" },
              { title: "Gender", dataIndex: "gender" },
              { title: "Birth date", dataIndex: "birth_date", value: (row) => (row.birth_date ? String(row.birth_date).slice(0, 10) : "") },
              { title: "Academic background", dataIndex: "academic_background" },
              { title: "Bial's starting date", dataIndex: "bial_starting_date", value: (row) => (row.bial_starting_date ? String(row.bial_starting_date).slice(0, 10) : "") },
              { title: "Status", dataIndex: "status" },
              activityColumn,
              createdColumn,
            ]} />
          {perm.canCreate && (
            <Button size="large" icon={<LuUpload />} onClick={() => setIsOpenImport(true)}>
              {t("Import")}
            </Button>
          )}
          {perm.canCreate && (<Button size="large" onClick={() => setIsOpenCreate(true)}>
            {t("Add User")}
          </Button>)}
        </div>
      </div>
      <Table
        dataSource={filterRows(tableData)}
        loading={isLoading}
        columns={[
          {
            // Avatar, nome e e-mail juntos, como a coluna "Nome" dos relatórios
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sort: true,
            sortType: "text",
            width: 320,
            render: (_, row) => <UserCell id={row.id} name={row.name} email={row.email} img={row.img} />,
          },
          {
            title: t("Language"),
            dataIndex: "language",
            key: "language",
          },
          {
            title: t("Country"),
            dataIndex: "country",
            key: "country",
          },
          {
            title: t("Role"),
            dataIndex: "role_name",
            key: "role_name",
            sort: true,
            sortType: "text",
          },
          {
            title: t("Status"),
            dataIndex: "status",
            key: "status_tag",
            sort: true,
            sortType: "text",
            render: (text, record) => record.status_tag,
            filters:
              tableData.filter((item) => item.status).length > 0
                ? tableData
                    .map((item, index) =>
                      item.status
                        ? { text: statusLabels[item.status] ?? item.status, value: item.status }
                        : {},
                    )
                    .filter((value, index, self) =>
                      value.text
                        ? index ===
                          self.findIndex((t) => t.value === value.text)
                        : null,
                    )
                : null,
          },
          {
            title: t("Activity"),
            dataIndex: "is_deleted",
            key: "is_deleted",
            render: (text, record) => record.activity_tag,
            filters: [
              { text: t("Active"), value: 0 },
              { text: t("Inactive"), value: 1 },
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
