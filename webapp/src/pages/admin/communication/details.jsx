import axios from "axios";
import dayjs from "dayjs";
import { useContext, useEffect, useMemo, useState } from "react";
import { Alert, Breadcrumb, Button, DatePicker, Form, Input, Modal, Progress, Select, Spin, Switch, Table, Tag } from "antd";
import { IoReturnDownBackOutline } from "react-icons/io5";
import { LuClock, LuDownload, LuEye, LuMail, LuSend, LuSettings, LuUsers } from "react-icons/lu";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AudienceForm, { audienceSummary } from "../../../components/admin/communication/audienceForm";
import EmailPreview from "../../../components/admin/email/emailPreview";
import CommunicationStats from "../../../components/admin/communication/stats";
import ExportTable from "../../../components/admin/export/export";
import PageFooter from "../../../components/admin/pageFooter";
import { SettingsSection } from "../../../components/admin/settingsSection";
import CommunicationStatus from "../../../utils/communicationStatus";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { parseEmailHtml, parseJson } from "../../../utils/emailHtml";
import { VARIABLES } from "../../../utils/emailTemplates";
import { usePermission } from "../../../utils/usePermission";

const EDITOR_VARIABLES = ["name", "email"];

export default function CommunicationDetails() {
  const { user, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("communication");
  const navigate = useNavigate();
  const { id } = useParams();

  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const [audience, setAudience] = useState({ scope: "all" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isOpenTest, setIsOpenTest] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isOpenSchedule, setIsOpenSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(null);

  // Destinatários (depois de enviar)
  const [recipients, setRecipients] = useState({ rows: [], total: 0 });
  const [recipientFilter, setRecipientFilter] = useState({ status: undefined, engagement: undefined, q: "", page: 1 });
  const [stats, setStats] = useState(null);
  const [exportRows, setExportRows] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [track, setTrack] = useState(true);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  const isDraft = data?.status === "draft";
  const isActive = data?.status === "scheduled" || data?.status === "sending";
  const canEdit = isDraft && perm.canUpdate;

  useEffect(() => {
    getData();
  }, [id]);

  // Agendada ou a enviar: acompanha o progresso
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => getData(false), 4000);
    return () => clearInterval(timer);
  }, [isActive, id]);

  useEffect(() => {
    if (data && !isDraft) {
      getRecipients();
      getStats();
    }
  }, [data?.status, data?.sent, data?.errors, recipientFilter]);

  // Avisa ao fechar o separador com alterações por guardar
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function getData(initial = true) {
    axios
      .get(endpoints.communication.readById, { params: { id } })
      .then((res) => {
        const row = res.data;
        setData((prev) => {
          // Em acompanhamento só mudam os números e o estado: não se mexe no que o utilizador está a editar
          if (!initial && prev) return { ...prev, status: row.status, sent: row.sent, errors: row.errors, pending: row.pending, total: row.total, started_at: row.started_at, finished_at: row.finished_at, error_message: row.error_message };
          return row;
        });
        if (initial) {
          form.setFieldsValue({ name: row.name, subject: row.subject });
          setAudience(parseJson(row.audience, { scope: "all" }));
          setTrack(row.track === undefined ? true : !!row.track);
          setIsDirty(false);
        }
      })
      .catch((err) => {
        console.log(err);
        if (err.response?.status === 404) navigate("/admin/communications");
      })
      .finally(() => setIsLoading(false));
  }

  function getStats() {
    axios
      .get(endpoints.communication.stats, { params: { id } })
      .then((res) => setStats(res.data))
      .catch((err) => console.log(err));
  }

  // Exporta todos os destinatários (não só a página) com o estado e, se houver rastreio, aberturas e cliques
  async function openExport() {
    setIsExporting(true);
    try {
      const res = await axios.get(endpoints.communication.recipients, { params: { id, all: 1 } });
      setExportRows(res.data.rows);
    } catch (err) {
      toastApi.open({ type: "error", content: apiError(err) });
    } finally {
      setIsExporting(false);
    }
  }

  function getRecipients() {
    setIsLoadingRecipients(true);
    axios
      .get(endpoints.communication.recipients, { params: { id, status: recipientFilter.status, engagement: recipientFilter.engagement, q: recipientFilter.q || undefined, page: recipientFilter.page, pageSize: 15 } })
      .then((res) => setRecipients(res.data))
      .catch((err) => console.log(err))
      .finally(() => setIsLoadingRecipients(false));
  }

  const apiError = (err) => err.response?.data?.message || err.response?.data?.error || t("Something went wrong, try again later.");

  // Grava as definições do rascunho (nome, assunto e público). Um rascunho grava-se sempre, mesmo incompleto (sem assunto, por
  // exemplo): o assunto só é exigido para enviar ou agendar. O conteúdo grava-se na página do editor.
  async function save({ silent = false } = {}) {
    const values = form.getFieldsValue();
    const name = values.name?.trim() || data.name;
    const subject = values.subject?.trim() || "";
    setIsSaving(true);
    try {
      await axios.post(endpoints.communication.update, { data: { id: data.id, name, subject, audience, track } });
      setData((prev) => ({ ...prev, name, subject }));
      form.setFieldsValue({ name, subject });
      setIsDirty(false);
      if (!silent) toastApi.open({ type: "success", content: t("Communication saved") });
      return true;
    } catch (err) {
      toastApi.open({ type: "error", content: apiError(err) });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  // O conteúdo edita-se noutra página: as definições por guardar guardam-se antes de sair
  async function editContent() {
    if (isDirty && !(await save({ silent: true }))) return;
    navigate(`/admin/communications/${id}/editor`);
  }

  async function sendTest() {
    setIsSendingTest(true);
    try {
      const res = await axios.post(endpoints.email.sendTest, {
        data: { email: testEmail.trim(), subject: form.getFieldValue("subject"), html: savedHtml, sample: previewSample },
      });
      if (res.data.sent) {
        toastApi.open({ type: "success", content: t("Test e-mail sent to {{email}}", { email: testEmail.trim() }) });
        setIsOpenTest(false);
      } else toastApi.open({ type: "error", content: `${t("The test e-mail could not be sent")}: ${res.data.message}` });
    } catch (err) {
      toastApi.open({ type: "error", content: apiError(err) });
    } finally {
      setIsSendingTest(false);
    }
  }

  // Grava e envia já (sem data) ou agenda
  async function send(scheduledAt = null) {
    if (!form.getFieldValue("subject")?.trim()) {
      toastApi.open({ type: "error", content: t("Add a subject to send or schedule the communication") });
      return;
    }
    setIsWorking(true);
    try {
      if (!(await save({ silent: true }))) return;
      const res = await axios.post(endpoints.communication.send, { data: { id: data.id, scheduled_at: scheduledAt ? scheduledAt.toISOString() : null } });
      toastApi.open({ type: "success", content: scheduledAt ? t("Communication scheduled for {{date}}", { date: scheduledAt.format("DD/MM/YYYY HH:mm") }) : t("Sending to {{count}} recipients", { count: res.data.total }) });
      setIsOpenSchedule(false);
      getData();
    } catch (err) {
      toastApi.open({ type: "error", content: apiError(err) });
    } finally {
      setIsWorking(false);
    }
  }

  function confirmSend() {
    Modal.confirm({
      title: t("Send this communication now?"),
      content: t("It will be sent to {{count}} recipients. This cannot be undone", { count: audienceTotal }),
      okText: t("Send now"),
      cancelText: t("Cancel"),
      onOk: () => send(null),
    });
  }

  async function action(endpoint, successMessage) {
    setIsWorking(true);
    try {
      await axios.post(endpoint, { data: { id: data.id } });
      toastApi.open({ type: "success", content: successMessage });
      getData();
    } catch (err) {
      toastApi.open({ type: "error", content: apiError(err) });
    } finally {
      setIsWorking(false);
    }
  }

  function confirmCancel() {
    const sending = data.status === "sending";
    Modal.confirm({
      title: sending ? t("Cancel the sending?") : t("Cancel the scheduling?"),
      content: sending ? t("The e-mails already sent are not recalled; the remaining ones will not be sent") : t("The communication goes back to draft"),
      okText: t("Yes, cancel"),
      cancelText: t("No"),
      onOk: () => action(endpoints.communication.cancel, t("Cancelled")),
    });
  }

  const [audienceTotal, setAudienceTotal] = useState(0);
  // O número de destinatários vem do formulário do público (a confirmação mostra o valor atual)
  useEffect(() => {
    if (!isDraft) return;
    const timer = setTimeout(() => {
      axios
        .post(endpoints.communication.audience, { data: { audience } })
        .then((res) => setAudienceTotal(res.data.total))
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [JSON.stringify(audience), isDraft]);

  const savedHtml = useMemo(() => parseEmailHtml(data?.html), [data?.html]);
  const hasContent = !!savedHtml;
  // O assunto é obrigatório para enviar ou agendar (não para gravar o rascunho nem para editar o conteúdo)
  const subjectValue = Form.useWatch("subject", form);
  const hasSubject = !!subjectValue?.trim();
  const previewSample = useMemo(() => Object.fromEntries(EDITOR_VARIABLES.map((key) => [key, VARIABLES[key].sample])), []);
  const percent = data?.total > 0 ? Math.round((((data.sent || 0) + (data.errors || 0)) / data.total) * 100) : 0;
  const validTestEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim());

  return (
    <div>
      <div className="flex justify-between items-center mb-4!">
        <Breadcrumb items={[{ title: <Link to="/admin/communications">{t("Communications")}</Link> }, { title: data?.name }]} />
        <Button type="text" className="text-sm cursor-pointer" icon={<IoReturnDownBackOutline />} onClick={() => navigate("/admin/communications")}>
          {t("Go back")}
        </Button>
      </div>

      <div className="bg-white shadow rounded-[16px]">
        <div className="rounded-t-[16px] p-6 pb-4 flex justify-between items-center gap-4 flex-wrap border-b border-[#F0F0F0]">
          <div className="min-w-0">
            <p className="text-xl font-bold mb-0! mt-1 truncate">{data?.name || t("Communication")}</p>
            <p className="text-[13px] text-[#8A8D98] mb-0!">{data?.subject || t("No subject")}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {data && <CommunicationStatus status={data.status} t={t} />}
            {data?.status === "scheduled" && data.scheduled_at && (
              <span className="text-[13px] text-[#666] flex items-center gap-1">
                <LuClock /> {dayjs(data.scheduled_at).format("DD/MM/YYYY HH:mm")}
              </span>
            )}
            {perm.canUpdate && isActive && (
              <Button danger loading={isWorking} onClick={confirmCancel}>
                {data.status === "sending" ? t("Cancel sending") : t("Cancel scheduling")}
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          <Spin spinning={isLoading}>
            {data && !isDraft && (
              <div className="flex flex-col gap-4 mb-6">
                {data.error_message && <Alert type="error" showIcon message={t("The sending failed")} description={data.error_message} />}
                {data.total > 0 && <CommunicationStats stats={stats} tracked={!!data.track} />}
                {data.total > 0 && (data.status === "sending" || data.errors > 0) && (
                  <div className="rounded-[15px] border border-solid border-[#E5E7EB] p-5">
                    <div className="flex justify-between flex-wrap gap-2 mb-2">
                      <span className="font-semibold">{t("{{sent}} of {{total}} sent", { sent: data.sent, total: data.total })}</span>
                      <span className="text-[13px] text-[#8A8D98]">
                        {data.errors > 0 && <Tag color="red">{t("{{count}} failed", { count: data.errors })}</Tag>}
                        {data.pending > 0 && <Tag>{t("{{count}} pending", { count: data.pending })}</Tag>}
                      </span>
                    </div>
                    <Progress percent={percent} status={data.status === "sending" ? "active" : data.errors > 0 ? "exception" : "success"} />
                    {perm.canUpdate && data.errors > 0 && data.status !== "sending" && (
                      <Button className="mt-2!" loading={isWorking} onClick={() => action(endpoints.communication.retry, t("Retrying the failed recipients"))}>
                        {t("Try the failed again")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 items-start">
              <Form form={form} layout="vertical" onValuesChange={() => setIsDirty(true)} disabled={!canEdit}>
                <SettingsSection id="communication-general" icon={<LuSettings />} title={t("General")} description={t("The name only identifies the communication in the dashboard. The subject is what the person sees in their inbox")}>
                  <Form.Item name="name" label={t("Name")}>
                    <Input size="large" maxLength={255} />
                  </Form.Item>
                  <Form.Item name="subject" label={t("Subject")} className="mb-0!" extra={t("Required to send or schedule. You can use {{name}} to put each person's name")}>
                    <Input size="large" maxLength={255} />
                  </Form.Item>
                </SettingsSection>
              </Form>

              <SettingsSection id="communication-audience" icon={<LuUsers />} title={t("Audience")} description={t("Who receives this communication")}>
                {isDraft ? (
                  <AudienceForm
                    value={audience}
                    disabled={!canEdit}
                    onChange={(next) => {
                      setAudience(next);
                      setIsDirty(true);
                    }}
                  />
                ) : (
                  <p className="mb-0!">{audienceSummary(audience, t)}</p>
                )}
              </SettingsSection>

              {canEdit && (
                <SettingsSection id="communication-send" icon={<LuSend />} title={t("Send")} description={t("The communication is saved when you send or schedule it")}>
                  {data?.track !== undefined && (
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold mb-0!">{t("Track clicks")}</p>
                        <p className="text-[12px] text-[#8A8D98] mb-0!">{t("Shows who clicked the links. The links pass through the platform before opening the original address")}</p>
                      </div>
                      <Switch
                        checked={track}
                        onChange={(checked) => {
                          setTrack(checked);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                  )}
                  <Button block icon={<LuSend />} disabled={!hasContent} onClick={() => setIsOpenTest(true)}>
                    {t("Send test e-mail")}
                  </Button>
                  <div className="border-0 border-t border-solid border-[#F0F0F0] my-4" />
                  <Button type="primary" block size="large" loading={isWorking} disabled={!hasContent || !hasSubject || audienceTotal === 0} onClick={confirmSend}>
                    {t("Send now")}
                  </Button>
                  <Button className="mt-2!" block icon={<LuClock />} disabled={!hasContent || !hasSubject || audienceTotal === 0} onClick={() => setIsOpenSchedule(true)}>
                    {t("Schedule")}
                  </Button>
                  {(!hasSubject || !hasContent) && <p className="text-[12px] text-[#D4880F] mt-3! mb-0!">{!hasSubject ? t("Add a subject to send or schedule the communication") : t("Add content to send or schedule the communication")}</p>}
                </SettingsSection>
              )}
            </div>

            <SettingsSection id="communication-content" icon={<LuEye />} title={t("Content")} description={isDraft ? t("How the saved e-mail looks, with example data") : t("The e-mail that was sent")}>
              {data && <EmailPreview html={savedHtml} sample={previewSample} onEdit={canEdit ? editContent : undefined} />}
            </SettingsSection>

            {data && !isDraft && data.total > 0 && (
              <SettingsSection id="communication-recipients" icon={<LuUsers />} title={t("Recipients")} description={t("Who received it and, when it failed, why")}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Input.Search allowClear className="max-w-xs" placeholder={t("Search by name, e-mail or error...")} onSearch={(q) => setRecipientFilter((f) => ({ ...f, q, page: 1 }))} />
                  <Select
                    allowClear
                    placeholder={t("Status")}
                    value={recipientFilter.status}
                    onChange={(status) => setRecipientFilter((f) => ({ ...f, status, page: 1 }))}
                    options={["sent", "error", "pending", "cancelled"].map((s) => ({ value: s, label: t({ sent: "Sent", error: "Failed", pending: "Pending", cancelled: "Cancelled" }[s]) }))}
                    className="w-40"
                  />
                  {recipients.tracking && (
                    <Select
                      allowClear
                      placeholder={t("Clicks")}
                      value={recipientFilter.engagement}
                      onChange={(engagement) => setRecipientFilter((f) => ({ ...f, engagement, page: 1 }))}
                      options={[
                        { value: "clicked", label: t("Clicked") },
                        { value: "not_clicked", label: t("Not clicked") },
                      ]}
                      className="w-44"
                    />
                  )}
                  <Button className="ml-auto" icon={<LuDownload />} loading={isExporting} onClick={openExport}>
                    {t("Export")}
                  </Button>
                </div>
                <Table
                  size="small"
                  loading={isLoadingRecipients}
                  rowKey="id"
                  dataSource={recipients.rows}
                  scroll={{ x: 600 }}
                  pagination={{ current: recipientFilter.page, pageSize: 15, total: recipients.total, showSizeChanger: false, onChange: (page) => setRecipientFilter((f) => ({ ...f, page })) }}
                  columns={[
                    { title: t("Name"), dataIndex: "name", key: "name", render: (name) => name || "-" },
                    { title: t("E-mail"), dataIndex: "email", key: "email" },
                    {
                      title: t("Status"),
                      dataIndex: "status",
                      key: "status",
                      width: 110,
                      render: (status) => <Tag color={{ sent: "green", error: "red", pending: "gold", cancelled: "default" }[status]}>{t({ sent: "Sent", error: "Failed", pending: "Pending", cancelled: "Cancelled" }[status])}</Tag>,
                    },
                    ...(recipients.tracking
                      ? [
                          { title: t("Clicked"), dataIndex: "clicked_at", key: "clicked_at", width: 160, render: (date, row) => (date ? <span className="text-[13px]">{dayjs(date).format("DD/MM/YYYY HH:mm")}{row.click_count > 1 ? ` · ${row.click_count}×` : ""}</span> : <span className="text-[#B0B3BD]">-</span>) },
                        ]
                      : []),
                    { title: t("Reason of the failure"), dataIndex: "error_message", key: "error_message", ellipsis: true, render: (message) => message || "-" },
                    { title: t("Date"), dataIndex: "sent_at", key: "sent_at", width: 150, render: (date) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-") },
                  ]}
                />
              </SettingsSection>
            )}
          </Spin>
        </div>
      </div>

      <ExportTable
        open={!!exportRows}
        close={() => setExportRows(null)}
        data={exportRows || []}
        table={`communication-${id}`}
        columns={[
          { title: "Name", key: "name" },
          { title: "E-mail", key: "email" },
          { title: "Status", key: "status", value: (row) => ({ sent: t("Sent"), error: t("Failed"), pending: t("Pending"), cancelled: t("Cancelled") })[row.status] },
          { title: "Date", key: "sent_at", value: (row) => (row.sent_at ? dayjs(row.sent_at).format("DD/MM/YYYY HH:mm") : "") },
          { title: "Reason of the failure", key: "error_message" },
          ...(exportRows?.some((r) => "clicked_at" in r)
            ? [
                { title: "Clicked", key: "clicked_at", value: (row) => (row.clicked_at ? dayjs(row.clicked_at).format("DD/MM/YYYY HH:mm") : "") },
                { title: "Clicks", key: "click_count" },
              ]
            : []),
        ]}
      />

      <Modal open={isOpenTest} title={t("Send test e-mail")} onCancel={() => setIsOpenTest(false)} okText={t("Send test e-mail")} cancelText={t("Cancel")} okButtonProps={{ disabled: !validTestEmail }} confirmLoading={isSendingTest} onOk={sendTest}>
        <p className="text-[13px] text-[#8A8D98]">{t("Sends the saved e-mail to an address, with example data. The result is recorded in System monitoring")}</p>
        <Input size="large" type="email" autoFocus value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="name@example.com" prefix={<LuMail className="text-[#8A8D98]" />} onPressEnter={() => validTestEmail && !isSendingTest && sendTest()} />
      </Modal>

      <Modal open={isOpenSchedule} title={t("Schedule the sending")} onCancel={() => setIsOpenSchedule(false)} okText={t("Schedule")} cancelText={t("Cancel")} okButtonProps={{ disabled: !scheduleDate }} confirmLoading={isWorking} onOk={() => send(scheduleDate)}>
        <p className="text-[13px] text-[#8A8D98]">{t("It will be sent to {{count}} recipients on the chosen date and time", { count: audienceTotal })}</p>
        <DatePicker showTime={{ format: "HH:mm" }} format="DD/MM/YYYY HH:mm" value={scheduleDate} onChange={setScheduleDate} disabledDate={(d) => d && d.isBefore(dayjs().startOf("day"))} className="w-full" size="large" />
      </Modal>

      <PageFooter className="justify-end px-12 md:px-14">
        {isDirty && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
        {canEdit && (
          <Button type="primary" loading={isSaving} disabled={!isDirty} onClick={() => save()}>
            {t("Save")}
          </Button>
        )}
      </PageFooter>
    </div>
  );
}
