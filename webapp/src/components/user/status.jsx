import { useContext, useEffect, useRef, useState } from "react";
import { Button, Drawer, Form, Input, Select, Divider, Switch, Modal } from "antd";
import { AiOutlinePlus } from "react-icons/ai";

import { Context } from "../../utils/context";
import { useTranslation } from "react-i18next";

export default function Status({ data, open, close, status }) {
  const { update } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  const { t } = useTranslation();

  function onClose() {
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await update({ data: { id: data.id, status: values.status }, table: "user" });
      setIsButtonLoading(false);
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
          {t("No")}
        </Button>,
        <Button loading={isButtonLoading} type="primary" onClick={form.submit}>
          {t("Yes")}
        </Button>,
      ]}
    >
      <div className="p-2 pb-0">
        <p className="text-[16px] font-bold">{t("Change user status")}</p>
        <div className="flex flex-col mt-4">
          <p>{t("Are you sure that you want to change status of this user?")}</p>
          <p className="mt-4">
            <b>{t("Name")}</b>: {data.name}
          </p>
          <p>
            <b>{t("E-mail")}</b>: {data.email}
          </p>
          <Form form={form} onFinish={submit} layout="vertical" className="mt-6!">
            <Form.Item name="status" label={t("New status")}>
              <Select
                size="large"
                className="w-full"
                placeholder={t("Select new status")}
                options={[
                  {
                    label: t("Approved"),
                    value: "approved",
                  },
                  {
                    label: t("Denied"),
                    value: "denied",
                  },
                ]}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
}
