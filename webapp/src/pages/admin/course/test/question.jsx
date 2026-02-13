import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";

import endpoints from "../../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, Empty, Form, Input, InputNumber, Switch, Tabs } from "antd";
import Constructor from "../constructor";
import { useParams } from "react-router-dom";
import Settings from "../settings";
import { RxTrash } from "react-icons/rx";

export default function Question({ data }) {
  const { user, update } = useContext(Context);

  const { t } = useTranslation();

  const [form] = Form.useForm();

  useEffect(() => {
    if (data) form.setFieldsValue(data);
  }, [data]);

  async function submit(values) {
    try {
      if (values.question) values.question = JSON.stringify(values.question);
      const res = await update({ table: "test", data: values });
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div>
          <Button onClick={form.submit}>{t("Save")}</Button>
        </div>
      </div>
      <Form form={form} onFinish={submit}>
        <Form.Item name="id" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.question !== currentValues.question}>
          {({ getFieldValue }) =>
            (!getFieldValue("question") || getFieldValue("question")?.length === 0) && (
              <div>
                <Empty />
              </div>
            )
          }
        </Form.Item>
        <Form.List name="question">
          {(fields, { add, remove, move }) => (
            <div>
              {fields.map((field) => (
                <div className={`p-6 flex flex-col bg-[#FFF] mb-4`}>
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-bold">
                      {t("Question nº ")} {field.name + 1}
                    </p>
                    <Button icon={<RxTrash />} onClick={() => remove(field.name)}>
                      {t("Delete")}
                    </Button>
                  </div>
                  <Form.Item name={[field.name, "title"]}>
                    <Input size="large" />
                  </Form.Item>
                  <Form.List name={[field.name, "answer"]}>
                    {(fieldsAnswer, { add, remove, move }) => (
                      <div className="p-6 border border-dashed ">
                        {fieldsAnswer.length > 0 && (
                          <div className={`grid grid-cols-6 gap-4 mb-4`}>
                            <div className="col-span-5">
                              <p>{t("Answers")}</p>
                            </div>
                            <div className="flex items-center">
                              <p>{t("Is correct")}</p>
                            </div>
                          </div>
                        )}
                        {fieldsAnswer.map((f) => (
                          <div className={`grid grid-cols-6 gap-4 mb-4`}>
                            <div className="col-span-5">
                              <Form.Item name={[f.name, "title"]} className="mb-0!">
                                <Input size="large" />
                              </Form.Item>
                            </div>
                            <div className="flex justify-center items-center">
                              <Form.Item name={[f.name, "is_correct"]} className="w-full! mb-0!" valuePropName="checked">
                                <Switch size="large" defaultValue={false} />
                              </Form.Item>
                            </div>
                          </div>
                        ))}
                        <Button onClick={() => add()}>{t("Add answer")}</Button>
                      </div>
                    )}
                  </Form.List>
                </div>
              ))}
              <div className="flex justify-center items-center">
                <Button className="mt-4" onClick={() => add()}>
                  {t("Add question")}
                </Button>
              </div>
            </div>
          )}
        </Form.List>
      </Form>
    </div>
  );
}
