import axios from "axios";
import { useCallback, useContext, useEffect, useState } from "react";
import { Button, Input, Select, Table, Tabs, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { LuActivity, LuCircleCheck, LuCircleX, LuClock, LuMail, LuServerCrash, LuTriangleAlert } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import RefreshButton from "../../components/admin/refreshButton";
import { useConfirm } from "../../components/admin/confirmModal";
import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";
import { usePermission } from "../../utils/usePermission";

const fmt = (value) => (value ? dayjs(value).format("DD/MM/YYYY HH:mm:ss") : "—");

// 90 -> "1 min 30 s"; 93784 -> "1 d 2 h 3 min"
function duration(seconds) {
  if (seconds == null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d} d ${h} h ${m} min`;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

const Stat = ({ icon, label, value, hint, tone = "#163986" }) => (
  <div className="flex items-center gap-3 rounded-[14px] bg-white p-4 shadow">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[20px]" style={{ backgroundColor: `${tone}14`, color: tone }}>
      {icon}
    </span>
    <div className="min-w-0">
      <p className="mb-0! text-[20px] font-bold leading-tight">{value}</p>
      <p className="mb-0! text-[12px] text-[#8A8D98]">{label}</p>
      {hint && <p className="mb-0! text-[11px] text-[#8A8D98]">{hint}</p>}
    </div>
  </div>
);

// Disponibilidade: estado agora, tempo desde o último arranque, tempo em baixo por janela e os incidentes
function Availability() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    axios
      .get(endpoints.monitor.status)
      .then((res) => {
        setStatus(res.data);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (error && !status) return <p className="py-10 text-center text-[#DB0709]">{t("Could not load the system status")}</p>;
  if (!status) return null;

  const online = status.status === "ok";
  const REASONS = { server_down: t("Server down"), database_down: t("Database unreachable") };
  const windows = [
    ["24h", t("Last 24 hours")],
    ["7d", t("Last 7 days")],
    ["30d", t("Last 30 days")],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={online ? <LuCircleCheck /> : <LuCircleX />} tone={online ? "#2F8351" : "#DB0709"} label={t("Status now")} value={online ? t("Online") : t("Database unreachable")} hint={`${t("Server time")}: ${fmt(status.server_time)}`} />
        <Stat icon={<LuClock />} label={t("Running since the last restart")} value={duration(status.uptime_seconds)} hint={`${t("Started at")}: ${fmt(status.started_at)}`} />
        <Stat icon={<LuTriangleAlert />} tone={status.errors_unresolved > 0 ? "#D97706" : "#2F8351"} label={t("Unresolved errors")} value={status.errors_unresolved} hint={t("{{count}} in the last 24 hours", { count: status.errors_24h })} />
        <Stat icon={<LuMail />} tone={status.email_errors_24h > 0 ? "#DB0709" : "#2F8351"} label={t("E-mail failures (24 hours)")} value={status.email_errors_24h} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {windows.map(([key, label]) => {
          const w = status.windows[key];
          return (
            <div key={key} className="rounded-[14px] bg-white p-4 shadow">
              <p className="mb-1! text-[12px] text-[#8A8D98]">{label}</p>
              <p className="mb-0! text-[26px] font-bold leading-tight" style={{ color: w.availability >= 99.9 ? "#2F8351" : w.availability >= 99 ? "#D97706" : "#DB0709" }}>
                {w.availability.toFixed(2)}%
              </p>
              <p className="mb-0! text-[12px] text-[#5B5F6B]">
                {t("Downtime")}: <b>{duration(w.downtime_seconds)}</b> · {t("{{count}} incidents", { count: w.incidents })}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-[14px] bg-white p-4 shadow">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="mb-0! font-bold">{t("Downtime incidents")}</p>
          <Tooltip title={t("Public address for an external uptime monitor (it answers 200 when the server and the database are working)")}>
            <Tag className="m-0!">/health</Tag>
          </Tooltip>
        </div>
        <Table
          size="small"
          rowKey="id"
          dataSource={status.incidents}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          locale={{ emptyText: t("No downtime recorded") }}
          scroll={{ x: "max-content" }}
          columns={[
            { title: t("Started"), dataIndex: "started_at", render: fmt },
            { title: t("Ended"), dataIndex: "ended_at", render: fmt },
            { title: t("Duration"), dataIndex: "duration_seconds", render: (v) => <b>{duration(v)}</b> },
            { title: t("Reason"), dataIndex: "reason", render: (v) => <Tag color={v === "database_down" ? "orange" : "red"}>{REASONS[v] ?? v}</Tag> },
          ]}
        />
        <p className="mb-0! mt-3 text-[12px] text-[#8A8D98]">
          {t("The downtime is calculated from the server heartbeat (every 30 seconds): when the server starts again, the time since its last heartbeat is recorded. Logs are kept for {{days}} days.", { days: status.retention_days })}
        </p>
      </div>
    </div>
  );
}

// Lista paginada no servidor, com pesquisa e filtros
function useServerList(endpoint, filters) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [state, setState] = useState({ rows: [], total: 0, extra: {} });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    axios
      .get(endpoint, { params: { ...filters, page, limit: pageSize } })
      .then((res) => {
        const { rows, total, ...extra } = res.data;
        setState({ rows, total, extra });
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(err.response?.data?.message || t("Could not load the data"));
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, JSON.stringify(filters), page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, page, pageSize, setPage, setPageSize, isLoading, reload: load };
}

function ErrorsTab() {
  const { t } = useTranslation();
  const { toastApi } = useContext(Context);
  const perm = usePermission("monitoring");
  const [confirm, confirmHolder] = useConfirm();
  const [filters, setFilters] = useState({ search: "", level: undefined, source: undefined, resolved: "0" });
  const list = useServerList(endpoints.monitor.errors, filters);
  const [selected, setSelected] = useState([]);

  const SOURCES = { request: t("Request failed"), unhandled_rejection: t("Unhandled rejection"), uncaught_exception: t("Uncaught exception") };

  function resolve(ids, resolved = true) {
    axios
      .post(endpoints.monitor.resolveErrors, { data: { ids, resolved } })
      .then(() => {
        toastApi.success(resolved ? t("Marked as resolved") : t("Marked as unresolved"));
        setSelected([]);
        list.reload();
      })
      .catch((err) => toastApi.error(err.response?.data?.message || t("Could not update the errors")));
  }

  function remove(ids) {
    confirm({
      tone: "danger",
      title: t("Delete the selected logs?"),
      description: t("{{count}} log(s) will be permanently deleted.", { count: ids.length }),
      okText: t("Delete"),
      onOk: () =>
        axios
          .post(endpoints.monitor.deleteErrors, { data: { ids } })
          .then(() => {
            toastApi.success(t("Logs deleted"));
            setSelected([]);
            list.reload();
          })
          .catch((err) => toastApi.error(err.response?.data?.message || t("Could not delete the logs"))),
    });
  }

  const set = (key, value) => {
    list.setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      {confirmHolder}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input.Search allowClear className="w-full sm:w-72!" placeholder={t("Search by message or route...")} onSearch={(v) => set("search", v)} />
          <Select allowClear className="w-40" placeholder={t("Type")} value={filters.level} onChange={(v) => set("level", v)} options={[{ value: "error", label: t("Error") }, { value: "warning", label: t("Warning") }]} />
          <Select allowClear className="w-48" placeholder={t("Source")} value={filters.source} onChange={(v) => set("source", v)} options={Object.entries(SOURCES).map(([value, label]) => ({ value, label }))} />
          <Select
            className="w-44"
            value={filters.resolved ?? "all"}
            onChange={(v) => set("resolved", v === "all" ? undefined : v)}
            options={[{ value: "0", label: t("Unresolved") }, { value: "1", label: t("Resolved") }, { value: "all", label: t("All") }]}
          />
        </div>
        <div className="flex items-center gap-2">
          {perm.canUpdate && selected.length > 0 && <Button onClick={() => resolve(selected)}>{t("Mark as resolved")} ({selected.length})</Button>}
          {perm.canDelete && selected.length > 0 && (
            <Button danger onClick={() => remove(selected)}>
              {t("Delete")} ({selected.length})
            </Button>
          )}
          <RefreshButton onClick={list.reload} />
        </div>
      </div>
      <Table
        rowKey="id"
        size="middle"
        loading={list.isLoading}
        dataSource={list.rows}
        scroll={{ x: "max-content" }}
        rowSelection={perm.canUpdate || perm.canDelete ? { selectedRowKeys: selected, onChange: setSelected } : undefined}
        pagination={{ current: list.page, pageSize: list.pageSize, total: list.total, showSizeChanger: true, pageSizeOptions: [15, 30, 50, 100], onChange: (p, s) => { list.setPage(p); list.setPageSize(s); }, showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        expandable={{
          expandedRowRender: (row) => (
            <div className="flex flex-col gap-2 text-[12px]">
              <p className="mb-0!">
                <b>{t("Message")}:</b> {row.message}
              </p>
              <p className="mb-0! text-[#8A8D98]">
                {row.ip && <>IP: {row.ip} · </>}
                {row.user_agent && <>{row.user_agent}</>}
              </p>
              {row.stack && <pre className="m-0 max-h-72 overflow-auto rounded-[10px] bg-[#0F172A] p-3 text-[11px] leading-relaxed text-[#E2E8F0]">{row.stack}</pre>}
            </div>
          ),
          rowExpandable: (row) => !!(row.stack || row.message),
        }}
        locale={{ emptyText: t("No errors recorded") }}
        columns={[
          { title: t("Date"), dataIndex: "created_at", width: 170, render: fmt },
          { title: t("Type"), dataIndex: "level", width: 100, render: (v) => <Tag color={v === "error" ? "red" : "orange"}>{v === "error" ? t("Error") : t("Warning")}</Tag> },
          { title: t("Source"), dataIndex: "source", width: 180, render: (v) => SOURCES[v] ?? v },
          { title: t("Message"), dataIndex: "message", ellipsis: true, width: 360, render: (v) => <span title={v}>{v}</span> },
          {
            title: t("Route"),
            key: "route",
            width: 260,
            ellipsis: true,
            render: (_, r) => (r.url ? <span className="text-[12px]">{r.status_code ? <Tag className="mr-1">{r.status_code}</Tag> : null}{r.method} {r.url}</span> : "—"),
          },
          { title: t("User"), dataIndex: "user_name", width: 160, render: (v) => v ?? "—" },
          { title: t("Status"), dataIndex: "is_resolved", width: 120, render: (v) => (v ? <Tag color="green">{t("Resolved")}</Tag> : <Tag color="red">{t("Unresolved")}</Tag>) },
        ]}
      />
    </div>
  );
}

function EmailsTab() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ search: "", status: undefined });
  const list = useServerList(endpoints.monitor.emails, filters);
  const set = (key, value) => {
    list.setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:max-w-md">
        <Stat icon={<LuCircleCheck />} tone="#2F8351" label={t("Sent")} value={list.extra.sent ?? 0} />
        <Stat icon={<LuCircleX />} tone="#DB0709" label={t("Failed")} value={list.extra.errors ?? 0} />
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input.Search allowClear className="w-full sm:w-72!" placeholder={t("Search by recipient, subject or error...")} onSearch={(v) => set("search", v)} />
          <Select allowClear className="w-44" placeholder={t("Status")} value={filters.status} onChange={(v) => set("status", v)} options={[{ value: "sent", label: t("Sent") }, { value: "error", label: t("Failed") }]} />
        </div>
        <RefreshButton onClick={list.reload} />
      </div>
      <Table
        rowKey="id"
        size="middle"
        loading={list.isLoading}
        dataSource={list.rows}
        scroll={{ x: "max-content" }}
        pagination={{ current: list.page, pageSize: list.pageSize, total: list.total, showSizeChanger: true, pageSizeOptions: [15, 30, 50, 100], onChange: (p, s) => { list.setPage(p); list.setPageSize(s); }, showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        expandable={{
          expandedRowRender: (row) => (
            <div className="flex flex-col gap-1 text-[12px]">
              {row.error_message && (
                <p className="mb-0! text-[#DB0709]">
                  <b>{t("Reason")}:</b> {row.error_message}
                </p>
              )}
              {row.smtp_response && (
                <p className="mb-0!">
                  <b>{t("SMTP response")}:</b> {row.smtp_response}
                </p>
              )}
              {row.message_id && <p className="mb-0! text-[#8A8D98]">Message-ID: {row.message_id}</p>}
            </div>
          ),
          rowExpandable: (row) => !!(row.error_message || row.smtp_response || row.message_id),
        }}
        locale={{ emptyText: t("No e-mails recorded") }}
        columns={[
          { title: t("Date"), dataIndex: "created_at", width: 170, render: fmt },
          { title: t("Status"), dataIndex: "status", width: 110, render: (v) => <Tag color={v === "sent" ? "green" : "red"}>{v === "sent" ? t("Sent") : t("Failed")}</Tag> },
          { title: t("Recipient"), dataIndex: "to_email", width: 240, ellipsis: true, render: (v) => v ?? "—" },
          {
            title: t("Reason of the failure"),
            key: "reason",
            width: 320,
            ellipsis: true,
            render: (_, r) => (r.status === "error" ? <span className="text-[#DB0709]" title={r.error_message}>{r.error_code ? `[${r.error_code}] ` : ""}{r.error_message}</span> : "—"),
          },
          { title: t("Subject"), dataIndex: "subject", width: 280, ellipsis: true, render: (v) => v ?? "—" },
          { title: t("E-mail type"), dataIndex: "template", width: 150, render: (v) => (v ? <Tag>{v}</Tag> : "—") },
          { title: t("Duration"), dataIndex: "duration_ms", width: 100, render: (v) => (v == null ? "—" : `${v} ms`) },
        ]}
      />
    </div>
  );
}

// Monitorização do sistema: disponibilidade (tempo em baixo), erros do servidor e e-mails enviados
export default function Monitoring() {
  const { t } = useTranslation();
  return (
    <div className="p-2">
      <div className="mb-2">
        <p className="text-xl font-bold">{t("System monitoring")}</p>
        <p className="mb-0! text-[14px] text-[#8A8D98]">{t("Availability, server errors and e-mails sent by the platform")}</p>
      </div>
      <Tabs
        items={[
          { key: "availability", label: <span className="flex items-center gap-2"><LuActivity />{t("Availability")}</span>, children: <Availability /> },
          { key: "errors", label: <span className="flex items-center gap-2"><LuServerCrash />{t("Server errors")}</span>, children: <ErrorsTab /> },
          { key: "emails", label: <span className="flex items-center gap-2"><LuMail />{t("E-mails")}</span>, children: <EmailsTab /> },
        ]}
      />
    </div>
  );
}
