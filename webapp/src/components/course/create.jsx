import { useContext, useState } from "react";
import { Button, Col, Row, Modal, Drawer, Form, Input } from "antd";
import axios from "axios";

import { Context } from "../../utils/context";
import endpoints from "../../utils/endpoints";

export default function Create({ open, close, submit }) {
  const { create } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await create({ data: values, table: "course" });
      setIsButtonLoading(false);
      close(true);
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
      title="Adicionar cliente"
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
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
