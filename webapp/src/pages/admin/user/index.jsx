import axios from "axios";
import RefreshButton from "../../../components/admin/refreshButton";
import ExportButton, { activityColumn, languageColumn, createdColumn } from "../../../components/admin/export/exportButton";
import { LuUpload } from "react-icons/lu";
import { usePermission } from "../../../utils/usePermission";
import { useContext, useEffect, useRef } from "react";
import RowActions from "../../../components/admin/rowActions";
import { useState } from "react";
import { Button, Table, Tag } from "antd";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import useListFilters from "../../../components/admin/listFilters";
import useDebounced from "../../../utils/useDebounced";
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

// Coluna da tabela → campo de ordenação aceite pela API (/user/list)
const SORT_FIELDS = { name: "name", country: "country", role_name: "role_name", status_tag: "status", is_deleted: "is_deleted" };

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

  // Paginação, pesquisa, filtros e ordenação são feitos no servidor: a página só pede as linhas que mostra
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState({ field: "name", order: "asc" });
  const [roles, setRoles] = useState([]);
  const requestRef = useRef(0);

  // Pesquisa e filtros fora da tabela: campos à vista e os restantes em "Mais filtros"
  const countryOptions = (() => {
    try {
      return JSON.parse(selectedLanguage?.country || "[]").map((c) => ({ label: t(c), value: c })).sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      return [];
    }
  })();
  const { toolbar, applied } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by name or e-mail..."), match: () => true },
    { key: "role", type: "select", primary: true, label: t("Role"), options: roles.map((r) => ({ label: r.name, value: r.id })), match: () => true },
    {
      key: "status",
      type: "select",
      label: t("Status"),
      options: [
        { label: t("Approved"), value: "approved" },
        { label: t("Pending"), value: "pending" },
        { label: t("Not Approved"), value: "not_approved" },
      ],
      match: () => true,
    },
    { key: "activity", type: "select", label: t("Activity"), options: [{ label: t("Active"), value: 0 }, { label: t("Inactive"), value: 1 }], match: () => true },
    { key: "country", type: "select", label: t("Country"), options: countryOptions, match: () => true },
  ]);
  const search = useDebounced((applied.q ?? "").trim());
  const filterKey = JSON.stringify([search, applied.role, applied.status, applied.activity, applied.country]);

  useEffect(() => {
    axios.get(endpoints.role.read).then((res) => setRoles(res.data.filter((r) => !r.is_deleted))).catch((err) => console.log(err));
  }, []);

  // Um filtro novo volta à primeira página
  useEffect(() => {
    setPage(1);
  }, [filterKey, selectedLanguage?.id]);

  useEffect(() => {
    if (selectedLanguage) getData();
  }, [selectedLanguage?.id, page, pageSize, filterKey, sort.field, sort.order]);

  const listParams = () => ({ id_lang: selectedLanguage.id, search, role: applied.role, status: applied.status, activity: applied.activity, country: applied.country, sort: sort.field, order: sort.order });

  function getData() {
    const request = ++requestRef.current;
    setIsLoading(true);
    axios
      .get(endpoints.user.list, { params: { ...listParams(), page, limit: pageSize } })
      .then((res) => {
        if (request !== requestRef.current) return;
        setData(res.data.rows);
        setTotal(res.data.total);
        prepareData(res.data.rows);
      })
      .catch((err) => console.log(err))
      .finally(() => {
        if (request === requestRef.current) setIsLoading(false);
      });
  }

  // Todas as linhas do filtro atual (para exportar), por páginas de 500
  async function fetchAllRows() {
    const rows = [];
    for (let p = 1; ; p++) {
      const res = await axios.get(endpoints.user.list, { params: { ...listParams(), page: p, limit: 500 } });
      rows.push(...res.data.rows);
      if (rows.length >= res.data.total || res.data.rows.length === 0) break;
    }
    return rows.map((u) => ({ ...u, language: selectedLanguage.code.toUpperCase(), country: t(u.country) }));
  }

  function prepareData(array) {
    const aux = [];
    for (let i = 0; i < array.length; i++) {
      aux.push({
        ...array[i],
        key: array[i].id,
        deleted: array[i].is_deleted,
        language: languages.find((l) => l.id === array[i].id_lang)?.code?.toUpperCase() ?? "",
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

  const sortOrderOf = (field) => (sort.field === field ? (sort.order === "desc" ? "descend" : "ascend") : null);

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
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} users", { total })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <RefreshButton size="large" onClick={() => getData()} />
          <ExportButton table="users" data={tableData} fetchAll={fetchAllRows} columns={[
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
        rowKey="id"
        dataSource={tableData}
        loading={isLoading}
        scroll={{ x: "max-content" }}
        pagination={{
          placement: ["none", "bottomCenter"],
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [15, 30, 50, 100],
          showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}`,
        }}
        onChange={(pagination, _filters, sorter) => {
          if (pagination.pageSize !== pageSize) setPageSize(pagination.pageSize);
          const field = SORT_FIELDS[sorter?.columnKey ?? sorter?.field];
          const next = field && sorter.order ? { field, order: sorter.order === "descend" ? "desc" : "asc" } : { field: "name", order: "asc" };
          if (next.field !== sort.field || next.order !== sort.order) {
            setSort(next);
            setPage(1);
          } else setPage(pagination.current);
        }}
        columns={[
          {
            // Avatar, nome e e-mail juntos, como a coluna "Nome" dos relatórios
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sorter: true,
            sortOrder: sortOrderOf("name"),
            width: 320,
            render: (_, row) => <UserCell id={row.id} name={row.name} email={row.email} img={row.img} />,
          },
          { title: t("Country"), dataIndex: "country", key: "country", sorter: true, sortOrder: sortOrderOf("country") },
          { title: t("Role"), dataIndex: "role_name", key: "role_name", sorter: true, sortOrder: sortOrderOf("role_name") },
          { title: t("Status"), dataIndex: "status", key: "status_tag", sorter: true, sortOrder: sortOrderOf("status"), render: (_, record) => record.status_tag },
          { title: t("Activity"), dataIndex: "is_deleted", key: "is_deleted", sorter: true, sortOrder: sortOrderOf("is_deleted"), render: (_, record) => record.activity_tag },
          { title: "", dataIndex: "actions", key: "actions", render: (_, record) => record.actions },
        ]}
      />
    </div>
  );
}
