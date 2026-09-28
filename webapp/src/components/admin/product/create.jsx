import { useContext, useState } from "react";
import { Button, Form, Input, Modal } from "antd";

import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import { requiredRule } from "../../../utils/formFieldError";

export default function Create({ open, close, nameRule }) {
  const { createLog, selectedLanguage, user, create } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      const res = await create({
        data: values,
        table: "product",
      });
      setIsButtonLoading(false);
      form.resetFields();
      close(true);
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <Modal
      key="modal-logout"
      width={500}
      style={{ top: 20 }}
      onCancel={onClose}
      open={open}
      maskClosable={false}
      footer={[
        <Button disabled={isButtonLoading} onClick={onClose}>
          {t("Cancel")}
        </Button>,
        <Button loading={isButtonLoading} type="primary" onClick={form.submit}>
          {t("Create")}
        </Button>,
      ]}>
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">{t("Create product")}</p>
        <div className="flex flex-col">
          <Form
            form={form}
            onFinish={submit}
            layout="vertical"
            className="mt-6!">
            <Form.Item
              name="name"
              label={t("Name")}
              rules={[requiredRule, nameRule()]}>
              <Input size="large" />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
