import axios from "axios";
import dayjs from "dayjs";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Breadcrumb, Button, Form, Input, Spin, Tag, Tooltip } from "antd";
import { IoReturnDownBackOutline } from "react-icons/io5";
import { RxReload } from "react-icons/rx";
import { LuBraces, LuMail, LuPencilLine, LuSend, LuSettings } from "react-icons/lu";
import EmailEditor from "react-email-editor";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import config from "../../../utils/config";
import endpoints from "../../../utils/endpoints";
import { VARIABLES, templateType } from "../../../utils/emailTemplates";
import { requiredRule } from "../../../utils/formFieldError";
import { usePermission } from "../../../utils/usePermission";
import { SettingsSection } from "../../../components/admin/settingsSection";
import PageFooter from "../../../components/admin/pageFooter";

export default function TemplateDetails() {
  const { user, toastApi } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("email_template");
  const navigate = useNavigate();
  const { id } = useParams();

  const [form] = Form.useForm();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const emailEditorRef = useRef(null);
  // O editor também dispara "design:updated" ao carregar o desenho: só conta como alteração depois de estabilizar
  const listenChanges = useRef(false);

  const kind = useMemo(() => templateType(data?.name_key), [data?.name_key]);

  useEffect(() => {
    getData();
  }, [id]);

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

  function getData() {
    axios
      .get(endpoints.email.readById, { params: { id } })
      .then((res) => {
        const row = res.data?.[0];
        if (!row) return;
        setData(row);
        form.setFieldsValue({ name: row.name, subject: row.subject });
        setIsDirty(false);
        // Recarregar com o editor já aberto: volta a carregar o desenho guardado
        if (editorReady) loadDesign(row);
      })
      .catch((err) => console.log(err))
      .finally(() => setIsLoading(false));
  }

  function loadDesign(row) {
    const unlayer = emailEditorRef.current?.editor;
    if (!unlayer) return;
    listenChanges.current = false;
    unlayer.loadDesign(row?.design ? JSON.parse(row.design) : {});
    setTimeout(() => (listenChanges.current = true), 1000);
  }

  // Variáveis do tipo de e-mail: aparecem no editor como "merge tags" (inserem-se com um clique no texto)
  const mergeTags = useMemo(
    () => Object.fromEntries(kind.variables.map((key) => [key, { name: t(VARIABLES[key].label), value: `{{${key}}}` }])),
    [kind, t],
  );

  const onReady = (unlayer) => {
    setEditorReady(true);
    loadDesign(data);
    unlayer.addEventListener("design:updated", () => {
      if (listenChanges.current) setIsDirty(true);
    });
    unlayer.registerCallback("image", (file, done) => {
      const formData = new FormData();
      formData.append("file", file.attachments[0]);
      axios
        .post(endpoints.email.upload, formData, { headers: { "Content-Type": "multipart/form-data" } })
        .then((res) => done({ progress: 100, url: `${config.server_ip}/media/${res.data.data.url}` }))
        .catch((err) => {
          console.log(err);
          toastApi.open({ type: "error", content: t("The image could not be uploaded") });
          done({ progress: 100, url: "" });
        });
    });
  };

  const exportHtml = () =>
    new Promise((resolve) => {
      const unlayer = emailEditorRef.current?.editor;
      if (!unlayer) return resolve(null);
      unlayer.exportHtml(({ design, html }) => resolve({ design, html }));
    });

  async function submit(values) {
    const exported = await exportHtml();
    if (!exported) return;
    setIsSaving(true);
    axios
      .post(endpoints.email.update, {
        data: {
          name_key: data.name_key,
          name: values.name,
          subject: values.subject,
          design: exported.design,
          html: exported.html,
          // O idioma é o do template (e não o escolhido no cabeçalho do backoffice, que pode ter mudado entretanto)
          id_lang: data.id_lang,
        },
      })
      .then(() => {
        setData((prev) => ({ ...prev, name: values.name, subject: values.subject, modified_at: new Date().toISOString() }));
        setIsDirty(false);
        toastApi.open({ type: "success", content: t("Template updated successfully!") });
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: t("Something went wrong, try again later.") });
      })
      .finally(() => setIsSaving(false));
  }

  async function downloadHtml() {
    const exported = await exportHtml();
    if (!exported) return;
    const url = URL.createObjectURL(new Blob([exported.html], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data?.name_key || "template"}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function sendTest() {
    const exported = await exportHtml();
    if (!exported) return;
    setIsSendingTest(true);
    axios
      .post(endpoints.email.sendTest, {
        data: {
          email: testEmail.trim(),
          subject: form.getFieldValue("subject"),
          html: exported.html,
          sample: Object.fromEntries(kind.variables.map((key) => [key, VARIABLES[key].sample])),
        },
      })
      .then((res) => {
        if (res.data.sent) toastApi.open({ type: "success", content: t("Test e-mail sent to {{email}}", { email: testEmail.trim() }) });
        else toastApi.open({ type: "error", content: `${t("The test e-mail could not be sent")}: ${res.data.message}` });
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: err.response?.data?.message || t("The test e-mail could not be sent") });
      })
      .finally(() => setIsSendingTest(false));
  }

  const validTestEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim());

  return (
    <div>
      <div className="flex justify-between items-center mb-4!">
        <Breadcrumb items={[{ title: <Link to="/admin/templates">{t("Templates")}</Link> }, { title: data?.name }]} />
        <Button type="text" className="text-sm cursor-pointer" icon={<IoReturnDownBackOutline />} onClick={() => navigate("/admin/templates")}>
          {t("Go back")}
        </Button>
      </div>

      <div className="bg-white shadow rounded-[16px]">
        <div className="rounded-t-[16px] p-6 pb-4 flex justify-between items-center gap-4 flex-wrap border-b border-[#F0F0F0]">
          <div className="min-w-0">
            <p className="text-xl font-bold mb-0! mt-1 truncate">{data?.name || t("Template")}</p>
            <p className="text-[13px] text-[#8A8D98] mb-0!">{t(kind.description)}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[13px] text-[#666]">
            <Tag variant="outlined" color={kind.system ? "blue" : "default"} className="m-0!">
              {t(kind.label)}
            </Tag>
            {data?.modified_at && (
              <span>
                {t("Last updated")}: {dayjs(data.modified_at).format("DD/MM/YYYY HH:mm")}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <Spin spinning={isLoading}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 items-stretch [&_section]:h-[calc(100%-20px)]">
              <div className="contents">
                <Form form={form} layout="vertical" onFinish={submit} onValuesChange={() => setIsDirty(true)} disabled={!perm.canUpdate}>
                  <SettingsSection id="template-general" icon={<LuSettings />} title={t("General")} description={t("The name only identifies this template in the dashboard. The subject is what the person sees in their inbox")}>
                    <Form.Item name="name" label={t("Name")} rules={[requiredRule]}>
                      <Input size="large" maxLength={255} />
                    </Form.Item>
                    <Form.Item name="subject" label={t("Subject")} rules={[requiredRule]} className="mb-0!">
                      <Input size="large" maxLength={255} />
                    </Form.Item>
                  </SettingsSection>
                </Form>

                <SettingsSection id="template-variables" icon={<LuBraces />} title={t("Variables")} description={t("Filled in with each person's data when the e-mail is sent. Use them in the subject and in the content")}>
                  <div className="flex flex-col gap-3">
                    {kind.variables.map((key) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold mb-0!">{t(VARIABLES[key].label)}</p>
                          <p className="text-[12px] text-[#8A8D98] mb-0!">{t(VARIABLES[key].hint)}</p>
                        </div>
                        <Tooltip title={t("Click to copy")}>
                          <Tag
                            className="cursor-pointer m-0! shrink-0"
                            onClick={() => {
                              navigator.clipboard?.writeText(`{{${key}}}`);
                              toastApi.open({ type: "success", content: t("Copied") });
                            }}>
                            {`{{${key}}}`}
                          </Tag>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] text-[#8A8D98] mt-4! mb-0!">{t("In the editor, the variables are also in the Merge Tags option of the text toolbar")}</p>
                </SettingsSection>

                {perm.canUpdate && (
                  <SettingsSection id="template-test" icon={<LuSend />} title={t("Send a test")} description={t("Sends the template as it is in the editor (even unsaved), with example data. The result is recorded in System monitoring")}>
                    <Input
                      size="large"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="name@example.com"
                      prefix={<LuMail className="text-[#8A8D98]" />}
                      onPressEnter={() => validTestEmail && !isSendingTest && sendTest()}
                    />
                    <Button className="mt-3!" block icon={<LuSend />} loading={isSendingTest} disabled={!validTestEmail || !editorReady} onClick={sendTest}>
                      {t("Send test e-mail")}
                    </Button>
                  </SettingsSection>
                )}
              </div>

              <div className="lg:col-span-3">
                <SettingsSection
                  id="template-content"
                  icon={<LuPencilLine />}
                  title={t("Content")}
                  description={t("Design the e-mail with the editor. Use the eye icon in the editor to preview it on desktop and mobile")}
                  extra={
                    <div className="flex gap-2 shrink-0">
                      <Button icon={<RxReload />} onClick={getData} aria-label={t("Reload")} title={t("Reload")} />
                      <Button onClick={downloadHtml} disabled={!editorReady}>
                        {t("Export HTML")}
                      </Button>
                    </div>
                  }>
                  {data && (
                    <div className="-m-2">
                      <EmailEditor
                        ref={emailEditorRef}
                        onReady={onReady}
                        minHeight={720}
                        options={{ version: "latest", appearance: { theme: "modern_light" }, mergeTags }}
                      />
                    </div>
                  )}
                </SettingsSection>
              </div>
            </div>
          </Spin>
        </div>
      </div>

      <PageFooter className="justify-end px-12 md:px-14">
        {isDirty && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
        {perm.canUpdate && (
          <Button type="primary" loading={isSaving} disabled={!isDirty || !editorReady} onClick={form.submit}>
            {t("Save")}
          </Button>
        )}
      </PageFooter>
    </div>
  );
}
