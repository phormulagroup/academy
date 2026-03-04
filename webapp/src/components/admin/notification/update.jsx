import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";
import countries from "../../../utils/countries.json";

import { Context } from "../../../utils/context";
import { useTranslation } from "react-i18next";
import TipTapFormField from "../tipTap/tipTapFormField";

export default function Update({ data, open, close, submit }) {
  const { update, selectedLanguage } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) {
      let aux = Object.assign({}, data);
      aux.title = aux.title ? JSON.parse(aux.title) : null;
      aux.description = aux.description ? JSON.parse(aux.description) : null;
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
      await update({ data: { ...values, id_lang: selectedLanguage.id }, table: "notification" });
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
      title="Editar linguagem"
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          Atualizar
        </Button>,
      ]}
    >
      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        validateMessages={{
          required: "Este campo é obrigatório!",
        }}
      >
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="title" label={t("Title")} rules={[{ required: true }]}>
          <TipTapFormField />
        </Form.Item>
        <Form.Item name="description" label={t("Description")} rules={[{ required: true }]}>
          <TipTapFormField />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
