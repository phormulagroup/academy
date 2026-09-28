import { useContext, useState } from "react";
import { Button, Form, Input, Modal } from "antd";

import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import { requiredRule } from "../../../utils/formFieldError";

export default function Create({ open, close }) {
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
        data: {
          name: values.name,
          name_key: `${values.name.toLowerCase().replace(/\s/g, "_")}_${selectedLanguage.id}`,
          id_lang: selectedLanguage.id,
        },
        table: "email",
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
        <p className="text-[16px] font-bold">{t("Create template")}</p>
        <div className="flex flex-col">
          <Form
            form={form}
            onFinish={submit}
            layout="vertical"
            className="mt-6!">
            <Form.Item rules={[requiredRule]} name="name" label={t("Name")}>
              <Input size="large" />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
