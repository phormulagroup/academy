import { useContext, useState } from "react";
import { Button, Drawer, Form, Input, Select } from "antd";
import countries from "../../../utils/countries.json";

import { Context } from "../../../utils/context";
import TipTapFormField from "../tipTap/tipTapFormField";
import { useTranslation } from "react-i18next";

export default function Create({ open, close, submit }) {
  const { create, selectedLanguage } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const { t } = useTranslation();

  const [form] = Form.useForm();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await create({ data: { ...values, id_lang: selectedLanguage.id }, table: "notification" });
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
      title="Adicionar linguagem"
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          Adicionar
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
