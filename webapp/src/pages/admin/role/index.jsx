import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { Button, Input, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { AiOutlinePlus } from "react-icons/ai";
import { RxReload } from "react-icons/rx";
import { useTranslation } from "react-i18next";

import RoleForm from "../../../components/admin/role/form";
import Delete from "../../../components/admin/delete";
import RowActions from "../../../components/admin/rowActions";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

const ADMIN_ROLE_ID = 1;

// Funções (papéis) e as permissões de cada uma por secção do backoffice. Só o Admin gere esta página.
export default function Role() {
  const { messageApi, setRoles, roles } = useContext(Context);
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [userCounts, setUserCounts] = useState({});
  const [selectedData, setSelectedData] = useState({});
  const [search, setSearch] = useState("");

  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isOpenUpdate, setIsOpenUpdate] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    Promise.all([axios.get(endpoints.role.read), axios.get(endpoints.user.read)])
      .then(([rolesRes, usersRes]) => {
        setRoles(rolesRes.data);
        const counts = {};
        for (const u of usersRes.data) {
          if (!u.is_deleted) counts[u.id_role] = (counts[u.id_role] || 0) + 1;
        }
        setUserCounts(counts);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
        messageApi.open({ type: "error", content: t("Failed to load the roles") });
      });
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
    setIsOpenCreate(false);
    setIsOpenUpdate(false);
    setIsOpenDelete(false);
  }

  const tableData = useMemo(
    () =>
      roles
        .filter((role) => !search || role.name?.toLowerCase().includes(search.toLowerCase()))
        .map((role) => ({ ...role, key: role.id, used_count: userCounts[role.id] || 0 })),
    [roles, userCounts, search],
  );

  return (
    <div className="p-6 bg-white shadow rounded-[16px]">
      <RoleForm data={isOpenUpdate ? selectedData : null} open={isOpenCreate || isOpenUpdate} close={closeAction} />
      <Delete
        data={selectedData}
        open={isOpenDelete}
        close={closeAction}
        table="role"
        onDeleteSuccess={() => messageApi.open({ type: "success", content: t("Role deleted successfully.") })}
      />
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold">{t("Permissions")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} roles", { total: tableData.length })}</p>
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
          <Button type="primary" icon={<AiOutlinePlus />} onClick={() => setIsOpenCreate(true)}>
            <span className="hidden sm:inline">{t("Add role")}</span>
          </Button>
        </div>
      </div>
      <Table
        dataSource={tableData}
        loading={isLoading}
        scroll={{ x: 50 }}
        pagination={{ placement: ["none", "bottomCenter"], showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            render: (name, record) => (
              <span className="flex items-center gap-2">
                {name}
                {record.id === ADMIN_ROLE_ID && <Tag color="blue">{t("Full access")}</Tag>}
              </span>
            ),
          },
          { title: t("Users"), dataIndex: "used_count", key: "used_count", width: "140px" },
          {
            title: "",
            key: "actions",
            width: "80px",
            render: (_, record) => (
              <RowActions
                items={[
                  // O Admin tem sempre acesso total: abre-se só para ver (sem matriz)
                  { label: record.id === ADMIN_ROLE_ID ? t("View") : t("Update"), key: `${record.id}-update`, icon: <FaRegEdit />, onClick: () => openUpdate(record) },
                  record.id !== ADMIN_ROLE_ID && {
                    label: record.used_count > 0 ? t("This role has users, so it cannot be deleted.") : t("Delete"),
                    key: `${record.id}-delete`,
                    icon: <FaRegTrashAlt />,
                    danger: true,
                    disabled: record.used_count > 0,
                    onClick: () => openDelete(record),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
