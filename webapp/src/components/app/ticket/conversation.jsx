import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button, Empty, Form, Popconfirm, Select, Spin, Tag, Upload } from "antd";
import { PiPaperclip } from "react-icons/pi";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";
import { usePermission } from "../../../utils/usePermission";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS, isEmptyHtml, parseAttachments } from "../../../utils/ticket";
import UserAvatar from "../../../utils/userAvatar";
import RichTextFormField from "../../admin/richText/richTextFormField";

// Conversa de um ticket, partilhada pela página do utilizador e pela gaveta do backoffice. Os controlos da equipa
// (prioridade, responsável, fechar) só aparecem a quem não é o dono do ticket e pode editar tickets.
export default function TicketConversation({ ticketId }) {
  const { user, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const { canUpdate: canManage } = usePermission("ticket");

  const [ticket, setTicket] = useState(null);
  // Distingue "falhou a carregar" de "este ticket não existe". Em ref porque getData() corre a cada 5s dentro do mesmo closure
  const [hasLoadError, setHasLoadError] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);

  const [form] = Form.useForm();
  const messagesEndRef = useRef();

  const isOwner = ticket && Number(ticket.id_user) === Number(user.id);
  const showStaffControls = !!ticket && !isOwner && canManage;
  const canReply = !!ticket && (isOwner || canManage);

  useEffect(() => {
    if (ticketId) getData();
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enquanto a conversa está aberta, volta a pedi-la de 5 em 5 segundos para as respostas novas aparecerem
  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(getData, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    if (!showStaffControls) return;
    axios
      .get(endpoints.ticket.assignableUsers)
      .then((res) => setAssignableUsers(res.data))
      .catch((err) => console.log(err));
  }, [showStaffControls]);

  // Os anexos não estão numa pasta pública: pedem-se com o token (axios) e abrem-se a partir de um blob local
  async function openAttachment(name) {
    try {
      const res = await axios.get(endpoints.ticket.attachment(ticketId, name), { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.log(err);
      toastApi.error(t("Could not open the attachment."));
    }
  }

  async function getData() {
    try {
      const res = await axios.get(endpoints.ticket.readById, { params: { id: ticketId } });
      setTicket(res.data.ticket);
      setMessages(res.data.messages);
      setHasLoadError(false);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.log(err);
      // Só a 1.ª carga mostra o erro: uma falha pontual nas repetições não deve fazer a conversa visível "piscar"
      if (!hasLoadedOnceRef.current) setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function submitReply(values) {
    if (isEmptyHtml(values.message)) return;
    setIsSending(true);
    const formData = new FormData();
    fileList.forEach((f) => formData.append("file", f));
    formData.append("data", JSON.stringify({ id_ticket: ticketId, message: values.message }));

    axios
      .post(endpoints.ticket.reply, formData)
      .then(() => {
        form.resetFields();
        setFileList([]);
        getData();
      })
      .catch((err) => toastApi.error(err.response?.data?.message || t("Could not send the reply.")))
      .finally(() => setIsSending(false));
  }

  function update(endpoint, data, errorMessage) {
    axios
      .post(endpoint, { data: { id: ticketId, ...data } })
      .then(() => getData())
      .catch((err) => toastApi.error(err.response?.data?.message || errorMessage));
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Spin spinning />
      </div>
    );
  }

  if (hasLoadError) return <Empty description={t("Could not load this ticket. Please try again.")} />;
  if (!ticket) return <Empty description={t("Ticket not found")} />;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center flex-wrap gap-2 pb-4 border-b border-[#E8E9F3] mb-4">
        <div>
          <p className="font-bold text-[18px] mb-1!">{ticket.subject}</p>
          <p className="text-[12px] text-[#8A8D98] mb-0!">
            {ticket.name} · {dayjs(ticket.created_at).format("DD/MM/YYYY HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {"priority" in ticket && <Tag color={PRIORITY_COLORS[ticket.priority]}>{t(PRIORITY_LABELS[ticket.priority])}</Tag>}
          <Tag color={STATUS_COLORS[ticket.status]}>{t(STATUS_LABELS[ticket.status])}</Tag>
        </div>
      </div>

      {showStaffControls && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 pb-4 border-b border-[#E8E9F3]">
          <div>
            <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Priority")}</p>
            <Select
              className="w-full!"
              value={ticket.priority}
              onChange={(priority) => update(endpoints.ticket.updatePriority, { priority }, t("Could not update the priority."))}
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label: t(label) }))}
            />
          </div>
          <div>
            <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Assignee")}</p>
            <Select
              className="w-full!"
              allowClear
              placeholder={t("No assignee")}
              value={ticket.id_assignee ?? undefined}
              onChange={(id_assignee) => update(endpoints.ticket.assign, { id_assignee: id_assignee ?? null }, t("Could not update the assignee."))}
              options={assignableUsers.map((u) => ({ value: u.id, label: u.name }))}
            />
          </div>
          <div className="flex items-end">
            {ticket.status === "aberto" ? (
              <Popconfirm
                title={t("Close this ticket?")}
                okText={t("Yes, close")}
                cancelText={t("No")}
                onConfirm={() => update(endpoints.ticket.updateStatus, { status: "fechado" }, t("Could not update the status."))}>
                <Button block>{t("Close ticket")}</Button>
              </Popconfirm>
            ) : (
              <Button block onClick={() => update(endpoints.ticket.updateStatus, { status: "aberto" }, t("Could not update the status."))}>
                {t("Reopen ticket")}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto flex flex-col pr-1">
        {messages.map((m) => {
          const attachments = parseAttachments(m.attachment);
          const isMine = Number(m.id_user) === Number(user.id);
          return (
            <div key={m.id} className="mb-4">
              <div className={isMine ? "flex flex-row-reverse" : "flex"}>
                <UserAvatar user={{ name: m.name, img: m.img }} className="w-10! h-10! min-w-10! min-h-10!" />
                <div className={`flex flex-col max-w-[80%] justify-center ${isMine ? "items-end mr-2" : "items-start ml-2"}`}>
                  <div
                    className={`${isMine ? "bg-[#E6F9FC] text-right text-[#163986]" : "bg-[#163986] text-white"} p-2 rounded-[5px]`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.message) }}
                  />
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => openAttachment(name)}
                          className="text-[12px] underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-[#163986]">
                          <PiPaperclip /> {name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] mt-2 mb-0! opacity-70">{dayjs(m.created_at).format("DD/MM/YYYY HH:mm")}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {canReply && (
        <div className="pt-4">
          <Form form={form} onFinish={submitReply}>
            <Form.Item name="message" className="mb-2!">
              <RichTextFormField placeholder={t("Write a reply...")} />
            </Form.Item>
            <div className="flex justify-between items-center">
              <Upload
                multiple
                maxCount={5}
                accept={ATTACHMENT_ACCEPT}
                fileList={fileList.map((f, i) => ({ uid: String(i), name: f.name, status: "done" }))}
                beforeUpload={(file) => {
                  if (file.size > MAX_ATTACHMENT_BYTES) {
                    toastApi.error(t("\"{{name}}\" is too large. The maximum size is 2MB.", { name: file.name }));
                    return Upload.LIST_IGNORE;
                  }
                  setFileList((prev) => [...prev, file]);
                  return false;
                }}
                onRemove={(file) => setFileList((prev) => prev.filter((_, i) => String(i) !== file.uid))}>
                <Button icon={<PiPaperclip />} title={t("Accepted formats: PDF, PNG, JPG, GIF and WEBP (max. 2MB per file)")}>
                  {t("Attach")}
                </Button>
              </Upload>
              <Button type="primary" htmlType="submit" loading={isSending}>
                {t("Send")}
              </Button>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}
