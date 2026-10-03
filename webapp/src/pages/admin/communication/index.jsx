import axios from "axios";
import dayjs from "dayjs";
import { useConfirm } from "../../../components/admin/confirmModal";
import { useContext, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Progress, Table } from "antd";
import { AiOutlinePlus } from "react-icons/ai";
import { CgDetailsMore } from "react-icons/cg";
import { FaRegTrashAlt } from "react-icons/fa";
import { LuCopy } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import RefreshButton from "../../../components/admin/refreshButton";
import RowActions from "../../../components/admin/rowActions";
import useListFilters, { includesText } from "../../../components/admin/listFilters";
import { audienceSummary } from "../../../components/admin/communication/audienceForm";
import CommunicationStatus from "../../../utils/communicationStatus";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { requiredRule } from "../../../utils/formFieldError";
import { usePermission } from "../../../utils/usePermission";

const parseAudience = (raw) => {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
};

export default function Communication() {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [confirm, confirmHolder] = useConfirm();
  const perm = usePermission("communication");
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpenCreate, setIsOpenCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getData();
  }, []);

  // Enquanto algo está agendado ou a enviar, a lista atualiza-se sozinha
  useEffect(() => {
    if (!data.some((c) => c.status === "sending" || c.status === "scheduled")) return;
    const timer = setInterval(() => getData(false), 5000);
    return () => clearInterval(timer);
  }, [data]);

  function getData(showLoading = true) {
    if (showLoading) setIsLoading(true);
    axios
      .get(endpoints.communication.read)
      .then((res) => setData(res.data.map((row) => ({ ...row, key: row.id }))))
      .catch((err) => console.log(err))
      .finally(() => setIsLoading(false));
  }

  async function create(values) {
    setIsCreating(true);
    try {
      const res = await axios.post(endpoints.communication.create, { data: { name: values.name } });
      form.resetFields();
      setIsOpenCreate(false);
      navigate(`/admin/communications/${res.data.id}`);
    } catch (err) {
      console.log(err);
      toastApi.open({ type: "error", content: t("Something went wrong, try again later.") });
    } finally {
      setIsCreating(false);
    }
  }

  async function duplicate(row) {
    try {
      const res = await axios.post(endpoints.communication.duplicate, { data: { id: row.id } });
      navigate(`/admin/communications/${res.data.id}`);
    } catch (err) {
      console.log(err);
      toastApi.open({ type: "error", content: t("Something went wrong, try again later.") });
    }
  }

  function remove(row) {
    confirm({
      title: t("Delete this communication?"),
      description: t("The communication and its list of recipients will be permanently deleted. The e-mails already sent are not recalled"),
      tone: "danger",
      okText: t("Delete"),
      onOk: () =>
        axios
          .post(endpoints.communication.delete, { data: { id: row.id } })
          .then(() => {
            toastApi.open({ type: "success", content: t("Communication deleted") });
            getData(false);
          })
          .catch((err) => toastApi.open({ type: "error", content: err.response?.data?.message || t("Something went wrong, try again later.") })),
    });
  }

  const { filterRows, toolbar } = useListFilters([
    { key: "q", type: "text", primary: true, placeholder: t("Search by name or subject..."), match: (row, v) => includesText(row.name, v) || includesText(row.subject, v) },
    {
      key: "status",
      type: "select",
      primary: true,
      label: t("Status"),
      options: ["draft", "scheduled", "sending", "sent", "failed", "cancelled"].map((s) => ({ value: s, label: t(s.charAt(0).toUpperCase() + s.slice(1)) })),
      match: (row, v) => row.status === v,
    },
  ]);
  const rows = filterRows(data);

  return (
    <div className="p-2">
      {confirmHolder}
      <Modal open={isOpenCreate} title={t("New communication")} onCancel={() => setIsOpenCreate(false)} maskClosable={false} okText={t("Create")} cancelText={t("Cancel")} confirmLoading={isCreating} onOk={form.submit}>
        <Form form={form} layout="vertical" onFinish={create} className="mt-4!">
          <Form.Item name="name" label={t("Name")} rules={[requiredRule]} extra={t("Only identifies the communication in the dashboard")}>
            <Input size="large" maxLength={255} autoFocus />
          </Form.Item>
        </Form>
      </Modal>

      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-xl font-bold font-ryker">{t("Communications")}</p>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("E-mails sent by the platform to the users you choose")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbar}
          <RefreshButton onClick={getData} />
          {perm.canCreate && (
            <Button type="primary" icon={<AiOutlinePlus />} onClick={() => setIsOpenCreate(true)}>
              <span className="hidden sm:inline">{t("Add")}</span>
            </Button>
          )}
        </div>
      </div>

      <Table
        dataSource={rows}
        loading={isLoading}
        scroll={{ x: 800 }}
        pagination={{ placement: ["none", "bottomCenter"], showTotal: (total, range) => `${range[0]}-${range[1]} ${t("of")} ${total}` }}
        onRow={(record) => ({ className: "cursor-pointer", onClick: () => navigate(`/admin/communications/${record.id}`) })}
        columns={[
          {
            title: t("Name"),
            dataIndex: "name",
            key: "name",
            sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
            render: (name, row) => (
              <div className="min-w-0">
                <p className="font-semibold mb-0! truncate">{name}</p>
                <p className="text-[12px] text-[#8A8D98] mb-0! truncate">{row.subject || t("No subject")}</p>
              </div>
            ),
          },
          { title: t("Status"), dataIndex: "status", key: "status", width: 120, render: (status) => <CommunicationStatus status={status} t={t} /> },
          { title: t("Audience"), key: "audience", width: 200, render: (_, row) => <span className="text-[13px]">{audienceSummary(parseAudience(row.audience), t)}</span> },
          {
            title: t("Delivery"),
            key: "delivery",
            width: 190,
            render: (_, row) =>
              row.total > 0 ? (
                <div>
                  <Progress percent={Math.round(((row.sent + row.errors) / row.total) * 100)} size="small" status={row.errors > 0 ? "exception" : row.status === "sent" ? "success" : "active"} showInfo={false} className="mb-0!" />
                  <p className="text-[12px] text-[#8A8D98] mb-0!">
                    {t("{{sent}} of {{total}} sent", { sent: row.sent, total: row.total })}
                    {row.errors > 0 && ` · ${t("{{count}} failed", { count: row.errors })}`}
                  </p>
                </div>
              ) : (
                <span className="text-[#B0B3BD]">-</span>
              ),
          },
          {
            title: t("Date"),
            key: "date",
            width: 150,
            sorter: (a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf(),
            defaultSortOrder: "descend",
            render: (_, row) => {
              const date = row.finished_at || row.started_at || row.scheduled_at || row.modified_at;
              return <span className="text-[13px]">{date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"}</span>;
            },
          },
          {
            title: "",
            key: "actions",
            width: 70,
            render: (_, row) => (
              <div className="flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
                <RowActions
                  items={[
                    { label: t("Details"), key: `${row.id}-details`, icon: <CgDetailsMore />, onClick: () => navigate(`/admin/communications/${row.id}`) },
                    perm.canCreate && { label: t("Duplicate"), key: `${row.id}-duplicate`, icon: <LuCopy />, onClick: () => duplicate(row) },
                    perm.canDelete && row.status !== "sending" && { label: t("Delete"), key: `${row.id}-delete`, icon: <FaRegTrashAlt />, danger: true, onClick: () => remove(row) },
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
