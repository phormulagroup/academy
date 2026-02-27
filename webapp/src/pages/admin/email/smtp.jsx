import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Form, Input, Switch } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import { Context } from "../../../utils/context";
import endpoints from "../../../utils/endpoints";

import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";

export default function SMTP() {
  const { user } = useContext(Context);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
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
        if (res.data && res.data.length > 0) {
          const smtpSettings = res.data.find((s) => s.name_key === "smtp");
          form.setFieldsValue(JSON.parse(smtpSettings.meta_data));
          setData(smtpSettings);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  function submit(values) {
    console.log(values);
    axios
      .post(endpoints.settings.update, {
        data: {
          id: data.id,
          meta_data: JSON.stringify(values),
        },
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function sendTestEmail() {
    console.log(form.getFieldsValue());
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-bold">{t("SMTP")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} />
        </div>
      </div>
      <div className="p-6 bg-white shadow">
        <Form form={form} layout="vertical" onFinish={submit}>
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="name" label={t("Sender name")} className="mb-0!">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="host" label={t("Host")} className="mb-0!">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="port" label={t("Port")} className="mb-0!">
              <Input size="large" />
            </Form.Item>
            <Form.Item name="is_secure" label={t("Is secure")} className="mb-0!" valuePropName="checked">
              <Switch size="large" />
            </Form.Item>
            <Form.Item name="email" label={t("E-mail")} className="mb-0!">
              <Input size="large" type="email" />
            </Form.Item>
            <Form.Item name="password" label={t("Password")} className="mb-0!">
              <Input.Password size="large" />
            </Form.Item>
          </div>
          <div className="flex justify-center items-center gap-4 mt-4">
            <Button size="large" type="primary" onClick={form.submit}>
              {t("Save")}
            </Button>
            <Button size="large" onClick={sendTestEmail}>
              {t("Test")}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
