import axios from "axios";
import dayjs from "dayjs";
import { useContext, useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  Button,
  Form,
  Input,
  Modal,
  Spin,
  Tag,
  Tooltip,
} from "antd";
import { IoReturnDownBackOutline } from "react-icons/io5";
import { LuBraces, LuEye, LuMail, LuSend, LuSettings } from "react-icons/lu";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import EmailPreview from "../../../components/admin/email/emailPreview";
import PageFooter from "../../../components/admin/pageFooter";
import { SettingsSection } from "../../../components/admin/settingsSection";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { parseEmailHtml } from "../../../utils/emailHtml";
import {
  AUDIENCES,
  VARIABLES,
  templateType,
} from "../../../utils/emailTemplates";
import { requiredRule } from "../../../utils/formFieldError";
import { usePermission } from "../../../utils/usePermission";

// Detalhes de um template: definições, variáveis, envio de teste e a pré-visualização do e-mail. O conteúdo edita-se noutra
// página (/admin/templates/:id/editor), só com o editor.
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
  const [testEmail, setTestEmail] = useState(user?.email || "");
  const [isOpenTest, setIsOpenTest] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const kind = useMemo(() => templateType(data?.name_key), [data?.name_key]);
  const html = useMemo(() => parseEmailHtml(data?.html), [data?.html]);
  const sample = useMemo(
    () => ({
      ...Object.fromEntries(
        Object.keys(VARIABLES).map((key) => [key, VARIABLES[key].sample]),
      ),
      ...kind.samples,
    }),
    [kind],
  );

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
      })
      .catch((err) => console.log(err))
      .finally(() => setIsLoading(false));
  }

  // Só o nome e o assunto: o conteúdo grava-se no editor
  async function submit(values) {
    setIsSaving(true);
    try {
      await axios.post(endpoints.email.update, {
        data: {
          name_key: data.name_key,
          name: values.name,
          subject: values.subject,
        },
      });
      setData((prev) => ({
        ...prev,
        name: values.name,
        subject: values.subject,
        modified_at: new Date().toISOString(),
      }));
      setIsDirty(false);
      toastApi.open({
        type: "success",
        content: t("Template updated successfully!"),
      });
    } catch (err) {
      console.log(err);
      toastApi.open({
        type: "error",
        content: t("Something went wrong, try again later."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function sendTest() {
    setIsSendingTest(true);
    try {
      const res = await axios.post(endpoints.email.sendTest, {
        data: {
          email: testEmail.trim(),
          subject: form.getFieldValue("subject"),
          html,
          sample,
        },
      });
      if (res.data.sent) {
        toastApi.open({
          type: "success",
          content: t("Test e-mail sent to {{email}}", {
            email: testEmail.trim(),
          }),
        });
        setIsOpenTest(false);
      } else
        toastApi.open({
          type: "error",
          content: `${t("The test e-mail could not be sent")}: ${res.data.message}`,
        });
    } catch (err) {
      console.log(err);
      toastApi.open({
        type: "error",
        content:
          err.response?.data?.message || t("The test e-mail could not be sent"),
      });
    } finally {
      setIsSendingTest(false);
    }
  }

  const validTestEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim());
  const editContent = () => navigate(`/admin/templates/${id}/editor`);

  return (
    <div>
      <div className="flex justify-between items-center mb-4!">
        <Breadcrumb
          items={[
            { title: <Link to="/admin/templates">{t("Templates")}</Link> },
            { title: data?.name },
          ]}
        />
        <Button
          type="text"
          className="text-sm cursor-pointer"
          icon={<IoReturnDownBackOutline />}
          onClick={() => navigate("/admin/templates")}>
          {t("Go back")}
        </Button>
      </div>

      <div className="bg-white shadow rounded-[16px]">
        <div className="rounded-t-[16px] p-6 pb-4 flex justify-between items-center gap-4 flex-wrap border-b border-[#F0F0F0]">
          <div className="min-w-0">
            <p className="text-xl font-bold mb-0! mt-1 truncate">
              {data?.name || t("Template")}
            </p>
            <p className="text-[13px] text-[#8A8D98] mb-0!">
              {t(kind.description)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[13px] text-[#666]">
            <Tag
              variant="outlined"
              color={kind.system ? "blue" : "default"}
              className="m-0!">
              {t(kind.label)}
            </Tag>
            <Tooltip title={t(AUDIENCES[kind.audience].hint)}>
              <Tag
                variant="outlined"
                color={AUDIENCES[kind.audience].color}
                className="m-0!">
                {t("Sent to")}: {t(AUDIENCES[kind.audience].label)}
              </Tag>
            </Tooltip>
            {data?.modified_at && (
              <span>
                {t("Last updated")}:{" "}
                {dayjs(data.modified_at).format("DD/MM/YYYY HH:mm")}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <Spin spinning={isLoading}>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-x-6 items-start">
              <div className="xl:col-span-1">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={submit}
                  onValuesChange={() => setIsDirty(true)}
                  disabled={!perm.canUpdate}>
                  <SettingsSection
                    id="template-general"
                    icon={<LuSettings />}
                    title={t("General")}
                    description={t(
                      "The name only identifies this template in the dashboard. The subject is what the person sees in their inbox",
                    )}>
                    <Form.Item
                      name="name"
                      label={t("Name")}
                      rules={[requiredRule]}>
                      <Input size="large" maxLength={255} />
                    </Form.Item>
                    <Form.Item
                      name="subject"
                      label={t("Subject")}
                      rules={[requiredRule]}
                      className="mb-0!">
                      <Input size="large" maxLength={255} />
                    </Form.Item>
                  </SettingsSection>
                </Form>

                <SettingsSection
                  id="template-variables"
                  icon={<LuBraces />}
                  title={t("Variables")}
                  description={t(
                    "Filled in with each person's data when the e-mail is sent. Use them in the subject and in the content",
                  )}>
                  <div className="flex flex-col gap-3">
                    {kind.variables.map((key) => (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold mb-0!">
                            {t(VARIABLES[key].label)}
                          </p>
                          <p className="text-[12px] text-[#8A8D98] mb-0!">
                            {t(VARIABLES[key].hint)}
                          </p>
                        </div>
                        <Tooltip title={t("Click to copy")}>
                          <Tag
                            className="cursor-pointer m-0! shrink-0"
                            onClick={() => {
                              navigator.clipboard?.writeText(`{{${key}}}`);
                              toastApi.open({
                                type: "success",
                                content: t("Copied"),
                              });
                            }}>
                            {`{{${key}}}`}
                          </Tag>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                </SettingsSection>

                {perm.canUpdate && (
                  <SettingsSection
                    id="template-test"
                    icon={<LuSend />}
                    title={t("Send a test")}
                    description={t(
                      "Sends the saved template to an address, with example data. The result is recorded in System monitoring",
                    )}>
                    <Button
                      block
                      icon={<LuSend />}
                      disabled={!html}
                      onClick={() => setIsOpenTest(true)}>
                      {t("Send test e-mail")}
                    </Button>
                  </SettingsSection>
                )}
              </div>

              <div className="xl:col-span-2">
                <SettingsSection
                  id="template-preview"
                  icon={<LuEye />}
                  title={t("Preview")}
                  description={t(
                    "How the saved e-mail looks, with example data",
                  )}>
                  <EmailPreview
                    html={html}
                    sample={sample}
                    onEdit={perm.canUpdate ? editContent : undefined}
                  />
                </SettingsSection>
              </div>
            </div>
          </Spin>
        </div>
      </div>

      <Modal
        open={isOpenTest}
        title={t("Send test e-mail")}
        onCancel={() => setIsOpenTest(false)}
        okText={t("Send test e-mail")}
        cancelText={t("Cancel")}
        okButtonProps={{ disabled: !validTestEmail }}
        confirmLoading={isSendingTest}
        onOk={sendTest}>
        <p className="text-[13px] text-[#8A8D98]">
          {t(
            "Sends the saved template to an address, with example data. The result is recorded in System monitoring",
          )}
        </p>
        <Input
          size="large"
          type="email"
          autoFocus
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="name@example.com"
          prefix={<LuMail className="text-[#8A8D98]" />}
          onPressEnter={() => validTestEmail && !isSendingTest && sendTest()}
        />
      </Modal>

      <PageFooter className="justify-end px-12 md:px-14">
        {isDirty && (
          <span className="text-[12px] text-[#8A8D98]">
            {t("Unsaved changes")}
          </span>
        )}
        {perm.canUpdate && (
          <Button
            type="primary"
            loading={isSaving}
            disabled={!isDirty}
            onClick={form.submit}>
            {t("Save")}
          </Button>
        )}
      </PageFooter>
    </div>
  );
}
