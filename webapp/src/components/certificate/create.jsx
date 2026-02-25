import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Form, Input, Modal, Select } from "antd";
import countries from "../../utils/countries.json";

import { Context } from "../../utils/context";
import Media from "../media/media";
import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import { useNavigate } from "react-router-dom";

export default function Update({ data, open, close, submit }) {
  const { create, languages } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [mediaKey, setMediaKey] = useState(null);
  const [isOpenMedia, setIsOpenMedia] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

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

  async function submit(values) {
    setIsButtonLoading(true);
    values.id_lang = languages.filter((l) => l.code === i18n.language)[0].id;
    try {
      const inserted = await create({ data: values, table: "course_certificate" });
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
      navigate(`/admin/certificate/${inserted.insertId}`);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      size={800}
      onClose={onClose}
      maskClosable={false}
      title={t("Create certificate")}
      footer={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          {t("Cancel")}
        </Button>,
        <Button size="large" type="primary" loading={isButtonLoading} onClick={form.submit}>
          {t("Submit")}
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
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
