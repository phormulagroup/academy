import axios from "axios";
import dayjs from "dayjs";
import RefreshButton from "../../components/admin/refreshButton";
import ExportButton, { languageColumn, createdColumn } from "../../components/admin/export/exportButton";
import { usePermission } from "../../utils/usePermission";
import { useContext, useEffect, useState } from "react";
import RowActions from "../../components/admin/rowActions";
import { Button, Progress, Tag, Tooltip } from "antd";
import { FaArrowAltCircleRight, FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { LuSend } from "react-icons/lu";

import Table from "../../components/admin/table";
import useListFilters, { includesText } from "../../components/admin/listFilters";
import NotificationForm from "../../components/admin/notification/form";
import { useConfirm } from "../../components/admin/confirmModal";
import { NotificationStatus } from "../../utils/notificationStatus";
import { notificationStatus } from "../../utils/notificationState";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";

// Texto simples de um conteúdo com HTML (título e descrição guardam-se com formatação)
const plain = (html) => {
  const el = document.createElement("div");
  el.innerHTML = html || "";
  return (el.textContent || "").replace(/\s+/g, " ").trim();
};

const parseCountries = (value) => {
  try {
    const list = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};
// user_groups: [{ "id": 1 }, ...] (como course_module.items)
const parseGroupIds = (value) => parseCountries(value).map((g) => Number(g?.id)).filter(Boolean);

// Etiquetas: as primeiras e "+N" com a lista completa
function TagList({ items, color }) {
  const shown = items.slice(0, 2);
  const rest = items.slice(2);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((c) => (
        <Tag key={c} color={color} className="m-0!">
          {c}
        </Tag>
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.join(", ")}>
          <Tag color={color} className="m-0! cursor-default">+{rest.length}</Tag>
        </Tooltip>
      )}
    </div>
  );
}

// Público da notificação: países (sem países, chega a todos) e, se houver, os grupos de utilizadores
function AudienceCell({ countries, groups, t }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {countries.length ? <TagList items={countries.map((c) => t(c))} /> : <span className="text-[#5B5F6B]">{t("All countries")}</span>}
      {groups.length > 0 && (
        <Tooltip title={t("User groups")}>
          <div>
            <TagList items={groups} color="blue" />
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default function Notification() {
  const { selectedLanguage, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("notification");
  const [confirm, confirmHolder] = useConfirm();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [selectedData, setSelectedData] = useState(null);
  const [isOpenForm, setIsOpenForm] = useState(false);
  // Nomes dos grupos de utilizadores (a notificação guarda só os ids)
  const [groupNames, setGroupNames] = useState({});

  useEffect(() => {
    axios
      .get(endpoints.userGroup.read, { params: { id_lang: selectedLanguage?.id } })
      .then((res) => setGroupNames(Object.fromEntries(res.data.map((g) => [g.id, g.name]))))
      .catch((err) => console.log(err));
  }, [selectedLanguage?.id]);

  useEffect(() => {
    getData();
  }, [selectedLanguage.id]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.notification.readByLang, { params: { id_lang: selectedLanguage.id } })
      .then((res) => setData(res.data.map((n) => ({ ...n, status: notificationStatus(n), countries: parseCountries(n.country), groupIds: parseGroupIds(n.user_groups), titleText: plain(n.title), descriptionText: plain(n.description) }))))
      .catch((err) => console.log(err))
      .finally(() => setIsLoading(false));
  }

  function openForm(row = null) {
    setSelectedData(row);
    setIsOpenForm(true);
  }

  function closeForm(changed) {
    if (changed) getData();
    setIsOpenForm(false);
  }

  function sendNotification(row) {
    confirm({
      title: t("Send this notification now?"),
      description: t("It reaches everyone in the audience right away. This cannot be undone"),
      tone: "warning",
      icon: <LuSend />,
      okText: t("Send now"),
      onOk: () =>
        axios
          .post(endpoints.notification.send, { data: { id: row.id } })
          .then((res) => {
            toastApi.success(t("Notification sent successfully") + ` (${res.data.delivered})`);
            getData();
          })
          .catch((err) => toastApi.error(err.response?.data?.message || t("Something went wrong, please try again"))),
    });
  }

  function remove(row) {
    confirm({
      title: t("Delete this notification?"),
      description: t("It disappears from the notifications of everyone who received it"),
      tone: "danger",
      okText: t("Delete"),
      onOk: () =>
        axios
          .post(endpoints.notification.delete, { data: { id: row.id } })
          .then(() => {
            toastApi.success(t("Notification deleted"));
            getData();
          })
          .catch((err) => toastApi.error(err.response?.data?.message || t("Something went wrong, please try again"))),
    });
  }

  const { filterRows, toolbar } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by title or description..."), match: (row, v) => includesText(row.titleText, v) || includesText(row.descriptionText, v) },
    {
      key: "status",
      type: "select",
      primary: true,
      label: t("Status"),
      options: ["draft", "scheduled", "sent"].map((s) => ({ value: s, label: t(s.charAt(0).toUpperCase() + s.slice(1)) })),
      match: (row, v) => row.status === v,
    },
  ]);
  const rows = filterRows(data).map((r) => {
    // Só grupos ativos (um grupo removido fica com is_deleted = 1 e deixa de aparecer)
    const groups = r.groupIds.filter((id) => groupNames[id]).map((id) => groupNames[id]);
    return { ...r, groups, groupsText: groups.join(", ") };
  });

  return (
    <div className="p-2">
      {confirmHolder}
      <NotificationForm data={selectedData} open={isOpenForm} close={closeForm} />
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Notifications")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} notifications", { total: rows.length })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <ExportButton table="notifications" data={rows} columns={[{ title: "ID", dataIndex: "id" }, { title: "Title", dataIndex: "titleText" }, { title: "Description", dataIndex: "descriptionText" }, { title: "Status", dataIndex: "status" }, { title: "Recipients", dataIndex: "recipients" }, { title: "Read", dataIndex: "read_count" }, languageColumn, { title: "Country", dataIndex: "country" }, { title: "User groups", dataIndex: "groupsText" }, createdColumn]} />
          <RefreshButton size="large" onClick={getData} />
          {perm.canCreate && (
            <Button size="large" onClick={() => openForm()} icon={<AiOutlinePlus />}>
              {t("Add notification")}
            </Button>
          )}
        </div>
      </div>
      <Table
        dataSource={rows.map((r) => ({ ...r, key: r.id, full_data: r }))}
        loading={isLoading}
        columns={[
          {
            title: t("Notification"),
            dataIndex: "titleText",
            key: "titleText",
            width: "34%",
            render: (_, row) => (
              <div className="min-w-0">
                <p className="mb-0! truncate font-semibold">{row.titleText || "—"}</p>
                <p className="mb-0! line-clamp-2 text-[13px] text-[#8A8D98]">{row.descriptionText}</p>
              </div>
            ),
          },
          {
            title: t("Audience"),
            dataIndex: "countries",
            key: "countries",
            width: "18%",
            render: (countries, row) => <AudienceCell countries={countries} groups={row.groups} t={t} />,
          },
          {
            title: t("Status"),
            dataIndex: "status",
            key: "status",
            width: "16%",
            render: (status, row) => (
              <div className="flex flex-col items-start gap-1">
                <NotificationStatus status={status} t={t} />
                {status === "scheduled" && <span className="text-[12px] text-[#8A8D98]">{dayjs(row.scheduled_at).format("DD/MM/YYYY HH:mm")}</span>}
                {status === "sent" && (row.sent_at || row.created_at) && <span className="text-[12px] text-[#8A8D98]">{dayjs(row.sent_at || row.created_at).format("DD/MM/YYYY HH:mm")}</span>}
              </div>
            ),
          },
          {
            title: t("Read by"),
            dataIndex: "recipients",
            key: "recipients",
            sort: true,
            sortType: "number",
            width: "18%",
            render: (_, row) =>
              row.recipients > 0 ? (
                <div className="min-w-32">
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span>
                      <b>{row.read_count}</b> / {row.recipients}
                    </span>
                    <span className="text-[#8A8D98]">{Math.round((row.read_count / row.recipients) * 100)}%</span>
                  </div>
                  <Progress percent={Math.round((row.read_count / row.recipients) * 100)} showInfo={false} size="small" strokeColor="#00B9D6" />
                </div>
              ) : (
                <span className="text-[#8A8D98]">—</span>
              ),
          },
          {
            title: t("Created"),
            dataIndex: "created_at",
            key: "created_at",
            width: "12%",
            render: (v) => <span className="text-[13px] text-[#5B5F6B]">{dayjs(v).format("DD/MM/YYYY")}</span>,
          },
          {
            title: "",
            dataIndex: "actions",
            key: "actions",
            width: "80px",
            render: (_, row) => (
              <div className="flex justify-end items-center">
                <RowActions
                  items={[
                    perm.canUpdate && row.status !== "sent" && { label: t("Send now"), key: `${row.id}-send`, icon: <FaArrowAltCircleRight />, onClick: () => sendNotification(row) },
                    perm.canUpdate && { label: t("Update"), key: `${row.id}-update`, icon: <FaRegEdit />, onClick: () => openForm(row) },
                    perm.canDelete && { label: t("Delete"), key: `${row.id}-delete`, icon: <FaRegTrashAlt />, danger: true, onClick: () => remove(row) },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
