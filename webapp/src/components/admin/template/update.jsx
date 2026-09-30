import { useContext, useEffect, useState } from "react";
import { Button, Form, Input, Modal } from "antd";

import { useTranslation } from "react-i18next";

import { Context } from "../../../utils/context";
import { requiredRule } from "../../../utils/formFieldError";

export default function Update({ data, open, close }) {
  const { update } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  useEffect(() => {
    if (data && open) {
      form.setFieldsValue({ ...data });
    }
  }, [open, data]);

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      const res = await update({
        table: "email",
        data: {
          ...data,
          name: values.name,
        },
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
          {t("Save")}
        </Button>,
      ]}>
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">{t("Update template")}</p>
        <div className="flex flex-col">
          <Form
            form={form}
            onFinish={submit}
            layout="vertical"
            className="mt-6!">
            <Form.Item name="id" hidden>
              <Input size="large" />
            </Form.Item>
            <Form.Item rules={[requiredRule]} name="name" label={t("Name")}>
              <Input size="large" />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
