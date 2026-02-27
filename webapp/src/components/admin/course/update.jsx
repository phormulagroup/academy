import { useState } from "react";
import { Button, Col, Row, Modal, Drawer, Form, Input, Alert, InputNumber } from "antd";

import { useContext } from "react";
import { Context } from "../../../utils/context";
import { useEffect } from "react";

export default function Update({ data, open, close, submit }) {
  const { update } = useContext(Context);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(data);
  }, [data, open === true]);

  function onClose() {
    form.resetFields();
    close();
  }

  async function submit(values) {
    setIsButtonLoading(true);
    try {
      await update({ data: values, table: "course" }, { old: data, new: values });
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
      title="Editar cliente"
      extra={[
        <Button loading={isButtonLoading} onClick={form.submit}>
          Guardar
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
          <Input size="large" />
        </Form.Item>
        <Form.Item name="is_deleted" hidden>
          <InputNumber size="large" />
        </Form.Item>
        {data.is_deleted ? (
          <div className="mb-4">
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.is_deleted !== currentValues.is_deleted}>
              {({ getFieldValue }) =>
                getFieldValue("is_deleted") ? (
                  <Alert
                    title="Cliente inativo"
                    showIcon
                    description={
                      <div className="flex flex-col justify-start items-start">
                        <p>Este cliente encontra-se inativo, se desejar ativar novamente basta clicar em ativar, e após isso terá de guardar!</p>
                        <Button className="mt-2" onClick={() => form.setFieldValue("is_deleted", 0)}>
                          Ativar
                        </Button>
                      </div>
                    }
                    type="info"
                  />
                ) : (
                  <Alert
                    title="Cliente ativo"
                    showIcon
                    description={
                      <div className="flex flex-col justify-start items-start">
                        <p>Este cliente encontra-se ativo, mas para efetuar as alterações terá de guardar!</p>
                      </div>
                    }
                    type="success"
                  />
                )
              }
            </Form.Item>
          </div>
        ) : null}
        <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
