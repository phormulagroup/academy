import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { Alert, Button, Form, Input, Select, Spin, Switch, Tag } from "antd";
import { LuCircleCheck, LuCircleX, LuInfo, LuMail, LuSend, LuServer, LuUserRound } from "react-icons/lu";
import { useTranslation } from "react-i18next";

import RefreshButton from "../../../components/admin/refreshButton";
import PageFooter from "../../../components/admin/pageFooter";
import { SettingsSection } from "../../../components/admin/settingsSection";
import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";
import { requiredRule } from "../../../utils/formFieldError";
import { usePermission } from "../../../utils/usePermission";

// Configurações rápidas: preenchem o servidor, a porta e a ligação segura (o resto é da conta de cada um)
const PRESETS = [
  { value: "ssl", label: "SSL / TLS (465)", values: { port: "465", is_secure: true } },
  { value: "starttls", label: "STARTTLS (587)", values: { port: "587", is_secure: false } },
  { value: "brevo", label: "Brevo", values: { host: "smtp-relay.brevo.com", port: "587", is_secure: false } },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Definições do servidor de e-mail (SMTP) usadas por tudo o que a plataforma envia: e-mails de conta, recuperação de password,
// templates e comunicações.
export default function SMTP() {
  // toastApi do Context: o contextHolder já está montado no Provider
  const { toastApi, user } = useContext(Context);
  const { t } = useTranslation();
  const perm = usePermission("settings");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [data, setData] = useState(null);
  const [testTo, setTestTo] = useState("");
  // Resultado do último teste: { sent, message, code }
  const [testResult, setTestResult] = useState(null);

  const [form] = Form.useForm();
  const host = Form.useWatch("host", form);
  const sender = Form.useWatch("email", form);
  const configured = !!host && !!sender;

  useEffect(() => {
    getData();
  }, []);

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
    setIsLoading(true);
    axios
      .get(endpoints.settings.read)
      .then((res) => {
        const smtpSettings = res.data?.find((s) => s.name_key === "smtp");
        if (smtpSettings) {
          const values = smtpSettings.meta_data ? JSON.parse(smtpSettings.meta_data) : {};
          form.setFieldsValue(values);
          setData(smtpSettings);
          setTestTo((prev) => prev || values.email || user?.email || "");
          setIsDirty(false);
        }
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Could not load the SMTP settings"));
      })
      .finally(() => setIsLoading(false));
  }

  function submit(values) {
    if (!data?.id) {
      toastApi.error(t("Could not load the SMTP settings"));
      return;
    }
    setIsSaving(true);
    axios
      .post(endpoints.settings.update, { data: { id: data.id, meta_data: JSON.stringify(values) } })
      .then(() => {
        toastApi.success(t("SMTP settings saved successfully"));
        setIsDirty(false);
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Could not save the SMTP settings, try again"));
      })
      .finally(() => setIsSaving(false));
  }

  // A porta decide a ligação segura mais habitual: 465 é SSL/TLS direto; 587, 25 e 2525 começam sem cifra e passam a TLS (STARTTLS)
  function onValuesChange(changed) {
    setIsDirty(true);
    if ("port" in changed) {
      const port = String(changed.port).trim();
      if (port === "465") form.setFieldValue("is_secure", true);
      else if (["587", "25", "2525"].includes(port)) form.setFieldValue("is_secure", false);
    }
  }

  function applyPreset(value) {
    const preset = PRESETS.find((p) => p.value === value);
    if (!preset) return;
    form.setFieldsValue(preset.values);
    setIsDirty(true);
  }

  // Testa os valores atuais do formulário (mesmo sem guardar) e mostra o resultado, com a razão se falhar
  async function sendTestEmail() {
    try {
      await form.validateFields(["host", "port", "email", "password"]);
    } catch {
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await axios.post(endpoints.email.test, { data: { ...form.getFieldsValue(), to: testTo.trim() } });
      setTestResult(res.data);
    } catch (err) {
      console.log(err);
      setTestResult({ sent: false, message: err.response?.data?.message || t("Could not send the test e-mail") });
    } finally {
      setIsTesting(false);
    }
  }

  const validTestTo = EMAIL_RE.test(testTo.trim());

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-xl font-bold font-ryker mb-0!">{t("SMTP")}</p>
            <Tag variant="outlined" color={configured ? "green" : "orange"} className="m-0!">
              {configured ? t("Configured") : t("Not configured")}
            </Tag>
          </div>
          <p className="text-[#8A8D98] text-[14px] mb-0!">{t("The mail server the platform uses to send e-mails")}</p>
        </div>
        <RefreshButton onClick={getData} />
      </div>

      <Spin spinning={isLoading}>
        <Form form={form} layout="vertical" onFinish={submit} onValuesChange={onValuesChange} disabled={!perm.canUpdate}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-x-6 items-start">
            <div className="xl:col-span-2">
              <SettingsSection id="smtp-server" icon={<LuServer />} title={t("Server")} description={t("Where the e-mails are sent from. Your hosting or e-mail service gives you these values")}>
                {perm.canUpdate && (
                  <Form.Item label={t("Quick setup")} extra={t("Fills in the port and the secure connection. The server and the account are yours to fill in")}>
                    <Select allowClear placeholder={t("Choose a common setup")} onChange={applyPreset} options={PRESETS.map((p) => ({ value: p.value, label: p.label }))} className="w-full md:w-72" />
                  </Form.Item>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                  <Form.Item name="host" label={t("Host")} rules={[requiredRule]} className="md:col-span-2" extra={t("For example mail.yourdomain.com")}>
                    <Input size="large" placeholder="mail.example.com" autoComplete="off" />
                  </Form.Item>
                  <Form.Item name="port" label={t("Port")} rules={[requiredRule, { pattern: /^\d{1,5}$/, message: t("Use only numbers") }]}>
                    <Input size="large" placeholder="465" inputMode="numeric" />
                  </Form.Item>
                </div>
                <Form.Item name="is_secure" label={t("Secure connection (SSL/TLS)")} valuePropName="checked" className="mb-0!" extra={t("On for port 465. Off for 587, which switches to a secure connection by itself (STARTTLS)")}>
                  <Switch />
                </Form.Item>
              </SettingsSection>

              <SettingsSection id="smtp-account" icon={<LuUserRound />} title={t("Account and sender")} description={t("The account used to log in and the name that appears as the sender")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <Form.Item name="email" label={t("E-mail")} rules={[requiredRule, { type: "email", message: t("Enter a valid e-mail address") }]} extra={t("Used to log in and as the sender address")}>
                    <Input size="large" type="email" placeholder="academy@example.com" autoComplete="off" />
                  </Form.Item>
                  <Form.Item name="name" label={t("Sender name")} extra={t("What the person sees as the sender, for example Bial Academy")}>
                    <Input size="large" placeholder="Bial Academy" />
                  </Form.Item>
                  <Form.Item name="password" label={t("Password")} rules={[requiredRule]} className="mb-0!">
                    <Input.Password size="large" autoComplete="new-password" />
                  </Form.Item>
                </div>
              </SettingsSection>
            </div>

            <div className="xl:col-span-1">
              <SettingsSection id="smtp-test" icon={<LuSend />} title={t("Test the settings")} description={t("Sends a test e-mail with the values above, even if you have not saved them yet")}>
                <p className="text-[13px] mb-1!">{t("Send the test to")}</p>
                <Input size="large" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="name@example.com" prefix={<LuMail className="text-[#8A8D98]" />} disabled={!perm.canUpdate} onPressEnter={() => validTestTo && !isTesting && sendTestEmail()} />
                <Button className="mt-3!" block icon={<LuSend />} loading={isTesting} disabled={!perm.canUpdate || !validTestTo || isSaving} onClick={sendTestEmail}>
                  {t("Send test e-mail")}
                </Button>
                {testResult && (
                  <Alert
                    className="mt-4!"
                    showIcon
                    icon={testResult.sent ? <LuCircleCheck /> : <LuCircleX />}
                    type={testResult.sent ? "success" : "error"}
                    message={testResult.sent ? t("Test e-mail sent to {{email}}", { email: testTo.trim() }) : t("The test e-mail could not be sent")}
                    description={testResult.sent ? t("Check the inbox (and the spam folder) of that address") : [testResult.message, testResult.code ? `(${testResult.code})` : null].filter(Boolean).join(" ")}
                  />
                )}
              </SettingsSection>

              <SettingsSection id="smtp-info" icon={<LuInfo />} title={t("Where it is used")} description={t("Everything the platform sends goes through this server")}>
                <ul className="m-0! pl-5 text-[13px] flex flex-col gap-1.5">
                  <li>{t("Account e-mails (registration, status, password recovery)")}</li>
                  <li>{t("Templates and their test e-mails")}</li>
                  <li>{t("Communications, sent in batches")}</li>
                </ul>
                <p className="text-[12px] text-[#8A8D98] mt-3! mb-0!">{t("Hosting servers limit how many e-mails can be sent per hour. For many recipients, a dedicated e-mail service (for example Brevo) delivers better")}</p>
              </SettingsSection>
            </div>
          </div>
        </Form>
      </Spin>

      <PageFooter className="justify-end px-12 md:px-14">
        {isDirty && <span className="text-[12px] text-[#8A8D98]">{t("Unsaved changes")}</span>}
        {perm.canUpdate && (
          <Button type="primary" loading={isSaving} disabled={!isDirty || isTesting} onClick={form.submit}>
            {t("Save")}
          </Button>
        )}
      </PageFooter>
    </div>
  );
}
