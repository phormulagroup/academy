import { useContext, useEffect, useState } from "react";
import { Button, Drawer, Input, Form } from "antd";

import { Context } from "../../../utils/context";

export default function Translations({ data, defaultLanguage, open, close }) {
  const { update } = useContext(Context);
  const [auxData, setAuxData] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState("");

  const isEditing = (record) => record.key === editingKey;

  useEffect(() => {
    if (open) {
      const aux = Object.assign([], data);
      if (!aux.translation) {
        const newTranlations = [];
        if (defaultLanguage.translation) {
          const defaultTrans = JSON.parse(defaultLanguage.translation);
          for (let i = 0; i < defaultTrans.length; i++) {
            newTranlations.push({ key: defaultTrans[i].key, value: "" });
          }
          console.log(newTranlations);
          form.setFieldsValue({ translations: newTranlations });
        }
      } else {
        form.setFieldsValue({ translations: aux.translation ? JSON.parse(aux.translation) : [] });
      }
    }
  }, [open]);

  function onClose() {
    close();
  }

  async function submit(values) {
    try {
      await update({ data: { id: data.id, translation: JSON.stringify(values.translations) }, table: "language" });
      setIsButtonLoading(false);
      close(true);
      form.resetFields();
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <Drawer open={open} size={800} onClose={onClose} maskClosable={false} title="Traduções" extra={[]}>
      <Form form={form} onFinish={submit}>
        <Form.List name="translations">
          {(fields, { add, remove, move }) => (
            <div>
              <div className={`grid grid-cols-2 gap-4 mb-4`}>
                <div>{defaultLanguage.name}</div>
                <div>{data.name}</div>
              </div>
              {fields.map((field) => (
                <div className={`grid grid-cols-2 gap-4`}>
                  <Form.Item name={[field.name, "key"]} key={field.name}>
                    <Input size="large" />
                  </Form.Item>
                  <Form.Item name={[field.name, "value"]} key={field.name} className="w-full!">
                    <Input size="large" />
                  </Form.Item>
                </div>
              ))}
              <Button onClick={() => add()}>Add translation</Button>
            </div>
          )}
        </Form.List>
        <Button loading={isButtonLoading} onClick={form.submit} className="mt-4">
          Save
        </Button>
      </Form>
    </Drawer>
  );
}
