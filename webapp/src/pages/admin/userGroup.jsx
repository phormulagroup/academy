import axios from "axios";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect, useMemo, useState } from "react";
import { Button, Input, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { AiOutlinePlus } from "react-icons/ai";
import { RxReload } from "react-icons/rx";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import UserGroupForm from "../../components/admin/userGroup/form";
import Delete from "../../components/admin/delete";
import RowActions from "../../components/admin/rowActions";

import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";

// Grupos de utilizadores: listas reutilizáveis de pessoas, usadas para restringir o acesso a cursos
export default function UserGroup() {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("user_group");

  const [isLoading, setIsLoading] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);

  const [search, setSearch] = useState("");

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.userGroup.read)
      .then((res) => {
        prepareData(res.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
        toastApi.open({ type: "error", content: t("Failed to load the user groups") });
      });
  }

  function prepareData(array) {
    setTableData(
      array.map((row, i) => ({
        key: i + 1,
        id: row.id,
        name: row.name,
        created_at: row.created_at ? dayjs(row.created_at).format("DD/MM/YYYY") : null,
        full_data: row,
        actions: (
          <RowActions
            items={[
              perm.canUpdate && { label: t("Update"), key: `${row.id}-update`, icon: <FaRegEdit />, onClick: () => openUpdate(row) },
              perm.canDelete && { label: t("Delete"), key: `${row.id}-delete`, icon: <FaRegTrashAlt />, onClick: () => openDelete(row) },
            ]}
          />
        ),
      })),
    );
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
    if (c) getData();
    setIsOpenUpdate(false);
    setIsOpenCreate(false);
    setIsOpenDelete(false);
  }

  const filteredData = useMemo(() => {
    if (!search) return tableData;
    return tableData.filter((row) => row.full_data.name?.toLowerCase().includes(search.toLowerCase()));
  }, [tableData, search]);

  return (
    <div className="p-6 bg-white shadow rounded-[16px]">
      <UserGroupForm data={isOpenUpdate ? selectedData : null} open={isOpenCreate || isOpenUpdate} close={closeAction} />
      <Delete data={selectedData} open={isOpenDelete} close={closeAction} table="userGroup" />
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold">{t("User groups")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} groups", { total: filteredData.length })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            allowClear
            placeholder={t("Search by name...")}
            prefix={<SearchOutlined />}
            className="w-full sm:w-64!"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={getData} icon={<RxReload />} aria-label={t("Refresh")} title={t("Refresh")} />
          {perm.canCreate && (<Button type="primary" onClick={() => setIsOpenCreate(true)} icon={<AiOutlinePlus />}>
            <span className="hidden sm:inline">{t("Add group")}</span>
          </Button>)}
        </div>
      </div>
      <Table
        dataSource={filteredData}
        loading={isLoading}
        scroll={{ x: 50 }}
        pagination={{ placement: ["none", "bottomCenter"], showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => (a.full_data.name || "").localeCompare(b.full_data.name || ""),
          },
          { title: t("Created at"), dataIndex: "created_at", key: "created_at" },
          { title: "", dataIndex: "actions", key: "actions", width: "80px" },
        ]}
      />
    </div>
  );
}
