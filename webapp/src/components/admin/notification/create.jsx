import { useContext, useState } from "react";
import { Button, Drawer, Form } from "antd";

import { Context } from "../../../utils/context";
import RichTextFormField from "../richText/richTextFormField";
import { useTranslation } from "react-i18next";
import { requiredRichTextRule } from "../../../utils/formFieldError";

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
      await create({
        data: { ...values, id_lang: selectedLanguage.id },
        table: "notification",
      });
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
      title={t("Add Notification")}
      extra={[
        <Button size="large" loading={isButtonLoading} onClick={form.submit}>
          {t("Add")}
        </Button>,
      ]}>
      <Form form={form} onFinish={submit} layout="vertical">
        <Form.Item
          name="title"
          label={t("Title")}
          rules={[requiredRichTextRule]}>
          <RichTextFormField />
        </Form.Item>
        <Form.Item
          name="description"
          label={t("Description")}
          rules={[requiredRichTextRule]}>
          <RichTextFormField />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
