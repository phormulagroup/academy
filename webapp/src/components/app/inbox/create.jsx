import { useContext, useState } from "react";
import { Button, Drawer, Form, Input, Modal, Select } from "antd";
import countries from "../../../utils/countries.json";

import { Context } from "../../../utils/context";
import { useTranslation } from "react-i18next";
import TipTapFormField from "../../admin/tipTap/tipTapFormField";

export default function Create({ open, close, submit }) {
  const { create, user } = useContext(Context);
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
      await create({ data: { ...values, from_id_user: user.id, to_id_user: null }, table: "inbox" });
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
    } catch (err) {
      console.log(err);
      setIsButtonLoading(false);
    }
  }

  return (
    <Modal
      key="modal-message"
      className="modal-message"
      width={600}
      style={{ minHeight: "calc(100vh - 40px)", top: 20, marginRight: 20 }}
      onCancel={() => close()}
      open={open}
      maskClosable={false}
      footer={[
        <div className="flex justify-end items-center">
          <Button className="mr-2">Cancel</Button>
          <Button onClick={form.submit}>Send</Button>
        </div>,
      ]}
      title={t("New thread")}
    >
      <Form
        form={form}
        onFinish={submit}
        layout="vertical"
        validateMessages={{
          required: "Este campo é obrigatório!",
        }}
      >
        <Form.Item name="title" label={t("Title")}>
          <Input size="large" />
        </Form.Item>
        <Form.Item name="text" label={t("Title")}>
          <TipTapFormField />
        </Form.Item>
      </Form>
    </Modal>
  );
}
