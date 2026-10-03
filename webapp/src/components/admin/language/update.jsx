import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";
import CountriesPicker from "./countriesPicker";

import { Context } from "../../../utils/context";
import { useTranslation } from "react-i18next";
import { requiredSelectRule } from "../../../utils/formFieldError";

export default function Update({ data, open, close, submit }) {
  const { update, getLanguages } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const { t } = useTranslation();
  const [languageOptions, setLanguageOptions] = useState([
    { flag: "https://flagcdn.com/es.svg", name: "Español" },
    { flag: "https://flagcdn.com/pt.svg", name: "Português" },
    { flag: "https://flagcdn.com/fr.svg", name: "Français" },
    { flag: "https://flagcdn.com/gb.svg", name: "English" },
  ]);

  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      let aux = Object.assign({}, data);
      aux.country = aux.country ? JSON.parse(aux.country) : null;
      form.setFieldsValue(aux);
    }
  }, [open]);

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await update({ data: values, table: "language" });
      // Atualiza idiomas/países na app (seletores de país e de idioma)
      await getLanguages();
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <Drawer
      open={open}
      size={800}
      onClose={onClose}
      maskClosable={false}
      title={t("Edit language")}
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          {t("Update")}
        </Button>,
      ]}>
      <Form form={form} onFinish={submit} layout="vertical">
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="flag" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="name" label={t("Name")} rules={[requiredSelectRule]}>
          <Select
            size="large"
            className="w-full"
            placeholder={t("Select...")}
            onChange={(e) =>
              form.setFieldValue(
                "flag",
                languageOptions.filter((i) => i.name === e)[0].flag,
              )
            }
            showSearch={{
              optionFilterProp: "label",
            }}
            options={languageOptions.map((o) => ({
              label: (
                <div className="flex justify-start items-center">
                  <img src={o.flag} className="max-w-5 mr-2" />
                  <p>{o.name}</p>
                </div>
              ),
              value: o.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="country"
          label={t("Countries")}
          rules={[requiredSelectRule]}>
          <CountriesPicker />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
