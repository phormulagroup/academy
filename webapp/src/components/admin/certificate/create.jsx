import { useContext, useEffect, useState } from "react";
import { Button, Form, Input, Modal } from "antd";

import { Context } from "../../../utils/context";
import { useNavigate } from "react-router-dom";
import { requiredRule } from "../../../utils/formFieldError";

export default function Create({ data, open, close, nameRule }) {
  const { create, selectedLanguage, t } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      let aux = Object.assign({}, data);
      form.setFieldsValue(aux);
    }
  }, [open]);

  function onClose() {
    form.resetFields();
    close();
  }

  async function onSubmit(values) {
    setIsButtonLoading(true);
    // Região escolhida no seletor do backoffice (o i18n fica no idioma da conta)
    values.id_lang = selectedLanguage.id;
    try {
      const inserted = await create({
        data: values,
        table: "course_certificate",
      });
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
      navigate(`/admin/certificate/${inserted.data.insertId}`);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      size={800}
      onCancel={onClose}
      maskClosable={false}
      title={t("Create certificate")}
      footer={[
        <Button size="large" loading={isButtonLoading} onClick={onClose}>
          {t("Cancel")}
        </Button>,
        <Button
          size="large"
          type="primary"
          loading={isButtonLoading}
          onClick={form.submit}>
          {t("Submit")}
        </Button>,
      ]}>
      <Form form={form} onFinish={onSubmit} layout="vertical">
        <Form.Item name="id" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          name="name"
          label={t("Name")}
          rules={[requiredRule, nameRule()]}>
          <Input size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
