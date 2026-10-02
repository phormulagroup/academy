import axios from "axios";
import { useContext, useEffect, useMemo, useState } from "react";
import { Badge, Button, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import { IoEyeOutline } from "react-icons/io5";
import { PiTicketFill, PiCheckCircleFill, PiUserFocusFill, PiWarningCircleFill } from "react-icons/pi";

import Details from "../../components/admin/ticket/details";
import UserCell from "../../components/admin/userCell";
import RowActions from "../../components/admin/rowActions";
import useListFilters, { includesText } from "../../components/admin/listFilters";

import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_TAG_COLORS, STATUS_COLORS, STATUS_LABELS } from "../../utils/ticket";

// A partir de quantos dias sem resposta da equipa um ticket aberto passa a mostrar o aviso "Sem resposta há X dias"
const DAYS_WITHOUT_REPLY_WARNING = 2;

// Tickets de suporte dos utilizadores: cartões de resumo por prioridade, filtros fora da tabela e conversa numa gaveta
export default function AdminTicket() {
  const { user, unreadTicketsCount, setUnreadTicketsCount, toastApi } = useContext(Context);
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isOpenDetails, setIsOpenDetails] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState(null); // clique num cartão de prioridade; outro clique limpa
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    getData();
    axios
      .get(endpoints.ticket.assignableUsers)
      .then((res) => setAssignableUsers(res.data))
      .catch((err) => console.log(err));
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.ticket.read)
      .then((res) => {
        setRows(res.data.data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
        toastApi.error(err.response?.data?.message || t("Failed to load the tickets"));
      });
    axios
      .get(endpoints.ticket.unreadCount)
      .then((res) => setUnreadTicketsCount(res.data.count || 0))
      .catch((err) => console.log(err));
  }

  function openDetails(id) {
    setSelectedId(id);
    setIsOpenDetails(true);
  }

  function closeAction(c) {
    if (c) getData();
    setIsOpenDetails(false);
    setSelectedId(null);
  }

  const { filterRows, toolbar } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by name, e-mail or subject..."), match: (row, v) => includesText(row.name, v) || includesText(row.email, v) || includesText(row.subject, v) },
    { key: "status", type: "select", primary: true, label: t("Status"), options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label: t(label) })), match: (row, v) => row.status === v },
    { key: "priority", type: "select", label: t("Priority"), options: Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label: t(label) })), match: (row, v) => row.priority === v },
    {
      key: "assignee",
      type: "select",
      label: t("Assignee"),
      options: [{ label: t("No assignee"), value: "none" }, ...assignableUsers.map((u) => ({ label: u.name, value: String(u.id) }))],
      match: (row, v) => (v === "none" ? row.id_assignee == null : String(row.id_assignee) === v),
    },
  ]);

  const priorityCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(PRIORITY_LABELS).map((p) => [p, 0]));
    rows.forEach((r) => {
      counts[r.priority] = (counts[r.priority] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const tableData = useMemo(
    () =>
      filterRows(rows)
        .filter((r) => (!priorityFilter || r.priority === priorityFilter) && (!onlyMine || r.id_assignee === user.id))
        .map((row) => {
          // O aviso só interessa enquanto o ticket está aberto e a última mensagem é do próprio utilizador (a equipa ainda não respondeu)
          const daysSinceLastMessage = dayjs().diff(dayjs(row.last_message_at), "day");
          const showNoReplyWarning = row.status === "aberto" && row.last_message_id_user === row.id_user && daysSinceLastMessage >= DAYS_WITHOUT_REPLY_WARNING;
          return { ...row, key: row.id, daysSinceLastMessage, showNoReplyWarning };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, priorityFilter, onlyMine, user.id, filterRows],
  );

  return (
    <div className="p-6 bg-white shadow rounded-[16px]">
      <Details ticketId={selectedId} open={isOpenDetails} close={closeAction} />
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <p className="text-xl font-bold">{t("Tickets")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("{{total}} tickets", { total: tableData.length })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {toolbar}
          <Button onClick={getData} icon={<RxReload />} aria-label={t("Refresh")} title={t("Refresh")} />
          <Button type={onlyMine ? "primary" : "default"} icon={<PiUserFocusFill />} onClick={() => setOnlyMine((prev) => !prev)}>
            <span className="hidden sm:inline">{t("My tickets")}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-3 mb-6">
        <div className="flex flex-col items-center justify-center gap-1 bg-[#F6F7F9] rounded-[15px] py-4 px-4 flex-1 min-w-[100px]">
          <PiTicketFill className="text-[20px] text-[#163986]" />
          <p className="text-[18px] font-bold mb-0! whitespace-nowrap">{rows.length}</p>
          <p className="text-[12px] text-[#8A8D98] mb-0! text-center whitespace-nowrap">{t("Total")}</p>
          {unreadTicketsCount > 0 && (
            <Tag color="red" className="flex items-center justify-center gap-1 m-0!">
              <PiWarningCircleFill /> {t("{{count}} unread", { count: unreadTicketsCount })}
            </Tag>
          )}
        </div>
        <div className="hidden lg:block w-px bg-[#E5E7EB] my-2" />
        {Object.keys(PRIORITY_LABELS).map((priority) => {
          const isActive = priorityFilter === priority;
          const color = PRIORITY_TAG_COLORS[priority];
          return (
            <button
              key={priority}
              type="button"
              onClick={() => setPriorityFilter(isActive ? null : priority)}
              className="relative flex flex-col items-center justify-center gap-1 rounded-[15px] py-4 px-4 flex-1 min-w-[100px] cursor-pointer border-2 transition-colors"
              style={{ backgroundColor: isActive ? `${color}1A` : "#F6F7F9", borderColor: isActive ? color : "transparent" }}>
              {isActive && <PiCheckCircleFill className="absolute top-1.5 right-1.5 text-[14px]" style={{ color }} />}
              <p className="text-[18px] font-bold mb-0! whitespace-nowrap" style={{ color: isActive ? color : undefined }}>
                {priorityCounts[priority] || 0}
              </p>
              <Tag className="text-[12px] mb-0! text-center whitespace-nowrap" color={PRIORITY_COLORS[priority]} variant={isActive ? "outlined" : "filled"}>
                {t(PRIORITY_LABELS[priority])}
              </Tag>
            </button>
          );
        })}
      </div>

      <Table
        dataSource={tableData}
        loading={isLoading}
        scroll={{ x: 50 }}
        onRow={(record) => ({ className: "cursor-pointer", onClick: () => openDetails(record.id) })}
        pagination={{ placement: ["none", "bottomCenter"], showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        columns={[
          {
            title: t("User"),
            key: "user",
            width: "220px",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            // stopPropagation: o link para o perfil não deve abrir também a gaveta
            render: (_, row) => (
              <div onClick={(e) => e.stopPropagation()}>
                <UserCell id={row.id_user} name={row.name} email={row.email} img={row.img} />
              </div>
            ),
          },
          {
            title: t("Subject"),
            key: "subject",
            render: (_, row) => (
              <div className="flex items-center gap-2">
                {!!row.unread && <Badge status="processing" />}
                <span className={row.unread ? "font-bold" : ""}>{row.subject}</span>
              </div>
            ),
          },
          { title: t("Priority"), key: "priority", width: "120px", render: (_, row) => <Tag color={PRIORITY_COLORS[row.priority]}>{t(PRIORITY_LABELS[row.priority])}</Tag> },
          { title: t("Status"), key: "status", width: "110px", render: (_, row) => <Tag color={STATUS_COLORS[row.status]}>{t(STATUS_LABELS[row.status])}</Tag> },
          {
            title: t("Assignee"),
            key: "assignee",
            width: "160px",
            render: (_, row) => (row.assignee_name ? <Tag color="#163986">{row.assignee_name}</Tag> : <Tag color="orange">{t("No assignee")}</Tag>),
          },
          {
            title: t("Last message"),
            key: "last_message_at",
            width: "170px",
            sorter: (a, b) => new Date(a.last_message_at) - new Date(b.last_message_at),
            render: (_, row) => (
              <div className="flex flex-col gap-1 items-start">
                <span>{dayjs(row.last_message_at).format("DD/MM/YYYY HH:mm")}</span>
                {row.showNoReplyWarning && (
                  <Tooltip title={t("The last message was from the user and nobody on the team has replied yet.")}>
                    <Tag color="red">{t("No reply for {{days}} days", { days: row.daysSinceLastMessage })}</Tag>
                  </Tooltip>
                )}
              </div>
            ),
          },
          {
            title: "",
            key: "actions",
            width: "80px",
            render: (_, row) => <RowActions items={[{ label: t("View ticket"), key: `${row.id}-view`, icon: <IoEyeOutline />, onClick: () => openDetails(row.id) }]} />,
          },
        ]}
      />
    </div>
  );
}
