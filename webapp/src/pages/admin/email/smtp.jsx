import axios from "axios";
import RefreshButton from "../../../components/admin/refreshButton";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Form, Input, Spin, Switch } from "antd";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

import { useTranslation } from "react-i18next";

export default function SMTP() {
  // toastApi do Context: o contextHolder já está montado no Provider (antes a página não mostrava nenhuma mensagem)
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [data, setData] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.settings.read)
      .then((res) => {
        const smtpSettings = res.data?.find((s) => s.name_key === "smtp");
        if (smtpSettings) {
          form.setFieldsValue(
            smtpSettings.meta_data ? JSON.parse(smtpSettings.meta_data) : {},
          );
          setData(smtpSettings);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Could not load the SMTP settings"));
        setIsLoading(false);
      });
  }

  function submit(values) {
    if (!data?.id) {
      toastApi.error(t("Could not load the SMTP settings"));
      return;
    }
    setIsSaving(true);
    axios
      .post(endpoints.settings.update, {
        data: {
          id: data.id,
          meta_data: JSON.stringify(values),
        },
      })
      .then(() => {
        toastApi.success(t("SMTP settings saved successfully"));
        setIsSaving(false);
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Could not save the SMTP settings, try again"));
        setIsSaving(false);
      });
  }

  function sendTestEmail() {
    // Testa os valores atuais do formulário (mesmo sem guardar); o e-mail é enviado para o próprio remetente
    setIsTesting(true);
    axios
      .post(endpoints.email.test, { data: form.getFieldsValue() })
      .then((res) => {
        if (res.data?.sent) {
          toastApi.success(t("Test e-mail sent successfully"));
        } else {
          toastApi.error(
            `${t("Could not send the test e-mail")}${res.data?.message ? `: ${res.data.message}` : ""}`,
          );
        }
        setIsTesting(false);
      })
      .catch((err) => {
        console.log(err);
        toastApi.error(t("Could not send the test e-mail"));
        setIsTesting(false);
      });
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold font-ryker">{t("SMTP")}</p>
        </div>
        <div>
          <RefreshButton size="large" onClick={getData} />
        </div>
      </div>
      <Spin spinning={isLoading}>
        <div className="p-4 sm:p-6 bg-white rounded-[5px] shadow-[0px_3px_6px_#00000029]">
          <Form form={form} layout="vertical" onFinish={submit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Form.Item name="name" label={t("Sender name")} className="mb-0!">
                <Input size="large" />
              </Form.Item>
              <Form.Item name="host" label={t("Host")} className="mb-0!">
                <Input size="large" />
              </Form.Item>
              <Form.Item name="port" label={t("Port")} className="mb-0!">
                <Input size="large" />
              </Form.Item>
              <Form.Item
                name="is_secure"
                label={t("Is secure")}
                className="mb-0!"
                valuePropName="checked">
                <Switch size="large" />
              </Form.Item>
              <Form.Item name="email" label={t("E-mail")} className="mb-0!">
                <Input size="large" type="email" />
              </Form.Item>
              <Form.Item
                name="password"
                label={t("Password")}
                className="mb-0!">
                <Input.Password size="large" />
              </Form.Item>
            </div>
            <div className="flex justify-center items-center gap-4 mt-4">
              <Button
                size="large"
                type="primary"
                loading={isSaving}
                disabled={isTesting}
                onClick={form.submit}>
                {t("Save")}
              </Button>
              <Button
                size="large"
                loading={isTesting}
                disabled={isSaving}
                onClick={sendTestEmail}>
                {t("Test")}
              </Button>
            </div>
          </Form>
        </div>
      </Spin>
    </div>
  );
}
