import axios from "axios";
import dayjs from "dayjs";
import { useContext, useEffect, useRef, useState } from "react";
import { Alert, Breadcrumb, Button, Input, Spin, Tag, Tooltip } from "antd";
import { IoReturnDownBackOutline } from "react-icons/io5";
import { LuCalendar, LuCheck, LuCopy, LuHash, LuHistory, LuLanguages, LuMail, LuMessageSquareText, LuReply, LuSend, LuShieldCheck, LuTrash2, LuUser, LuUserCheck } from "react-icons/lu";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Delete from "../../components/admin/delete";
import { SettingsSection } from "../../components/admin/settingsSection";
import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";
import SubmissionStatus from "../../utils/submissionStatus";
import { usePermission } from "../../utils/usePermission";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Uma linha de informação (ícone, nome e valor)
function Info({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-0 border-b border-solid border-[#F0F0F0] last:border-b-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F6F7FB] text-[#163986]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] text-[#8A8D98] mb-0!">{label}</p>
        <div className="text-[14px] break-words">{children}</div>
      </div>
    </div>
  );
}

// Detalhes de uma submissão do formulário de contacto: a mensagem completa, quem a enviou, os dados da submissão e as respostas. A resposta
// envia-se pelo e-mail da plataforma: fica registada (quem, quando, o texto) e mostra-se se o e-mail saiu ou, se falhou, porquê.
export default function FormSubmissionDetails() {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("form_submission");
  const navigate = useNavigate();
  const { id } = useParams();
  const replyRef = useRef(null);

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  // Resultado do último envio: { sent, message }
  const [result, setResult] = useState(null);

  useEffect(() => {
    getData(true);
  }, [id]);

  function getData(initial = false) {
    if (initial) setIsLoading(true);
    return axios
      .get(endpoints.form.readById, { params: { id } })
      .then((res) => {
        setData(res.data);
        if (initial) setSubject(`Re: ${res.data.subject || ""}`.trim());
      })
      .catch((err) => {
        console.log(err);
        if (err.response?.status === 404) navigate("/admin/answers", { replace: true });
      })
      .finally(() => setIsLoading(false));
  }

  function copyEmail() {
    navigator.clipboard?.writeText(data.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const apiError = (err) => err.response?.data?.message || t("Something went wrong, try again later.");

  async function sendReply() {
    setIsSending(true);
    setResult(null);
    try {
      const res = await axios.post(endpoints.form.reply, { data: { id: data.id, subject, message } });
      setResult(res.data);
      if (res.data.sent) {
        toastApi.open({ type: "success", content: t("Reply sent to {{email}}", { email: data.email }) });
        setMessage("");
      }
      await getData();
    } catch (err) {
      setResult({ sent: false, message: apiError(err) });
    } finally {
      setIsSending(false);
    }
  }

  async function retry(reply) {
    setRetryingId(reply.id);
    try {
      const res = await axios.post(endpoints.form.retryReply, { data: { id: reply.id } });
      toastApi.open({ type: res.data.sent ? "success" : "error", content: res.data.sent ? t("Reply sent to {{email}}", { email: reply.to_email }) : `${t("The reply could not be sent")}: ${res.data.message}` });
      await getData();
    } catch (err) {
      toastApi.open({ type: "error", content: apiError(err) });
    } finally {
      setRetryingId(null);
    }
  }

  const title = data?.subject?.trim() || t("No subject");
  const canReply = perm.canUpdate && data?.repliesAvailable;
  const validEmail = EMAIL_RE.test(data?.email || "");
  const sent = data?.replies?.filter((r) => r.status === "sent").length || 0;
  const failed = data?.replies?.filter((r) => r.status === "error").length || 0;
  // Sem a migração aplicada não há respostas na plataforma: continua a abrir o programa de e-mail, como antes
  const mailtoHref = data?.email ? `mailto:${data.email}?subject=${encodeURIComponent(`Re: ${data.subject || ""}`.trim())}` : undefined;
  const goToReply = () => replyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div>
      {data && (
        <Delete
          data={{ id: data.id, name: title }}
          open={isOpenDelete}
          close={(done) => {
            setIsOpenDelete(false);
            if (done) navigate("/admin/answers");
          }}
          table="form"
          onDeleteSuccess={() => toastApi.success(t("Submission deleted"))}
        />
      )}

      <div className="flex justify-between items-center mb-4!">
        <Breadcrumb items={[{ title: <Link to="/admin/answers">{t("Form Submissions")}</Link> }, { title: data ? title : "" }]} />
        <Button type="text" className="text-sm cursor-pointer" icon={<IoReturnDownBackOutline />} onClick={() => navigate("/admin/answers")}>
          {t("Go back")}
        </Button>
      </div>

      <Spin spinning={isLoading}>
        <div className="bg-white shadow rounded-[16px]">
          <div className="rounded-t-[16px] p-6 pb-4 flex justify-between items-center gap-4 flex-wrap border-b border-[#F0F0F0]">
            <div className="min-w-0">
              <p className="text-xl font-bold mb-0! mt-1">{title}</p>
              <p className="text-[13px] text-[#8A8D98] mb-0!">{data ? t("Received on {{date}}", { date: dayjs(data.created_at).format("DD/MM/YYYY HH:mm") }) : ""}</p>
            </div>
            {data && (
              <div className="flex items-center gap-2 flex-wrap">
                {data.repliesAvailable && <SubmissionStatus sent={sent} failed={failed} t={t} />}
                {canReply && validEmail && (
                  <Button type="primary" icon={<LuReply />} onClick={goToReply}>
                    {t("Reply")}
                  </Button>
                )}
                {!data.repliesAvailable && mailtoHref && (
                  <Button type="primary" icon={<LuReply />} onClick={() => (window.location.href = mailtoHref)}>
                    {t("Reply by e-mail")}
                  </Button>
                )}
                {perm.canDelete && (
                  <Button danger icon={<LuTrash2 />} onClick={() => setIsOpenDelete(true)}>
                    {t("Delete")}
                  </Button>
                )}
              </div>
            )}
          </div>

          {data && (
            <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-x-6 items-start">
              <div className="xl:col-span-2">
                <SettingsSection id="submission-message" icon={<LuMessageSquareText />} title={t("Message")} description={t("What the person wrote in the contact form")}>
                  {data.message?.trim() ? <div className="rounded-xl bg-[#F6F7FB] p-5 text-[14px] leading-relaxed whitespace-pre-wrap break-words">{data.message}</div> : <p className="text-[#8A8D98] mb-0!">{t("The message is empty")}</p>}
                </SettingsSection>

                {canReply && (
                  <div ref={replyRef}>
                    <SettingsSection id="submission-reply" icon={<LuSend />} title={t("Reply")} description={t("The reply is sent from the platform to the e-mail of the person, and is recorded here")}>
                      {!validEmail ? (
                        <Alert type="warning" showIcon message={t("This submission has no valid e-mail address to reply to")} />
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="text-[12px] text-[#8A8D98] mb-1!">{t("To")}</p>
                            <Input size="large" value={data.email} disabled prefix={<LuMail className="text-[#8A8D98]" />} />
                          </div>
                          <div>
                            <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Subject")}</p>
                            <Input size="large" maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} />
                          </div>
                          <div>
                            <p className="text-[12px] text-[#8A8D98] mb-1!">{t("Message")}</p>
                            <Input.TextArea rows={8} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("Write your reply here")} />
                          </div>
                          {result && !result.sent && <Alert type="error" showIcon message={t("The reply could not be sent")} description={result.message} />}
                          <div className="flex justify-end">
                            <Button type="primary" size="large" icon={<LuSend />} loading={isSending} disabled={!message.trim() || !subject.trim()} onClick={sendReply}>
                              {t("Send reply")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </SettingsSection>
                  </div>
                )}

                {data.repliesAvailable && data.replies.length > 0 && (
                  <SettingsSection id="submission-replies" icon={<LuHistory />} title={`${t("Replies")} (${data.replies.length})`} description={t("What was answered, by whom and if the e-mail was delivered to the mail server")}>
                    <div className="flex flex-col gap-3">
                      {data.replies.map((reply) => (
                        <div key={reply.id} className={`rounded-xl border border-solid p-4 ${reply.status === "sent" ? "border-[#E5E7EB] bg-white" : "border-red-200 bg-red-50/40"}`}>
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <div className="flex items-center gap-2 text-[13px]">
                              <Tag color={reply.status === "sent" ? "green" : "red"} className="m-0!">
                                {reply.status === "sent" ? t("Sent") : t("Failed")}
                              </Tag>
                              <span className="font-semibold">{reply.user_name || t("Unknown user")}</span>
                              <span className="text-[#8A8D98]">{dayjs(reply.created_at).format("DD/MM/YYYY HH:mm")}</span>
                            </div>
                            {reply.status === "error" && perm.canUpdate && (
                              <Button size="small" icon={<LuSend />} loading={retryingId === reply.id} onClick={() => retry(reply)}>
                                {t("Try again")}
                              </Button>
                            )}
                          </div>
                          <p className="text-[12px] text-[#8A8D98] mb-1!">
                            {reply.subject} · {reply.to_email}
                          </p>
                          <div className="text-[14px] whitespace-pre-wrap break-words">{reply.message}</div>
                          {reply.status === "error" && reply.error_message && <p className="text-[12px] text-red-600 mt-2! mb-0!">{reply.error_message}</p>}
                        </div>
                      ))}
                    </div>
                  </SettingsSection>
                )}
              </div>

              <div className="xl:col-span-1">
                <SettingsSection id="submission-sender" icon={<LuUser />} title={t("Sender")} description={t("Who sent the message")}>
                  <Info icon={<LuUser />} label={t("Name")}>
                    {data.name?.trim() || <span className="text-[#B0B3BD]">-</span>}
                  </Info>
                  <Info icon={<LuMail />} label={t("E-mail")}>
                    {data.email ? (
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        <a href={`mailto:${data.email}`}>{data.email}</a>
                        <Tooltip title={copied ? t("Copied") : t("Copy")}>
                          <Button type="text" size="small" icon={copied ? <LuCheck className="text-[#06D186]" /> : <LuCopy />} onClick={copyEmail} aria-label={t("Copy")} />
                        </Tooltip>
                      </span>
                    ) : (
                      <span className="text-[#B0B3BD]">-</span>
                    )}
                  </Info>
                  <Info icon={<LuUserCheck />} label={t("Registered user")}>
                    {data.user ? <Link to={`/admin/users/${data.user.id}`}>{data.user.name}</Link> : <span className="text-[#8A8D98]">{t("Not a registered user")}</span>}
                  </Info>
                </SettingsSection>

                <SettingsSection id="submission-details" icon={<LuHash />} title={t("Submission")} description={t("Data of this submission")}>
                  <Info icon={<LuCalendar />} label={t("Date")}>
                    {dayjs(data.created_at).format("DD/MM/YYYY HH:mm")}
                  </Info>
                  <Info icon={<LuLanguages />} label={t("Language")}>
                    {data.language?.name || "-"}
                  </Info>
                  <Info icon={<LuShieldCheck />} label={t("Privacy consent")}>
                    <Tag variant="outlined" color={data.acceptance ? "green" : "default"} className="m-0!">
                      {data.acceptance ? t("Accepted") : t("Not given")}
                    </Tag>
                  </Info>
                  <Info icon={<LuHash />} label="ID">
                    {data.id}
                  </Info>
                </SettingsSection>
              </div>
            </div>
          )}
        </div>
      </Spin>
    </div>
  );
}
