import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";

import endpoints from "../../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Divider, Empty, Form, Input, InputNumber, Switch, Tabs } from "antd";
import Constructor from "../constructor";
import { useParams } from "react-router-dom";

export default function Settings() {
  const { user, update } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const { t } = useTranslation();
  let { id, idTest } = useParams();

  const [form] = Form.useForm();

  useEffect(() => {
    console.log("settings");
  }, []);

  function save(values) {
    console.log(values);
  }

  return (
    <div className="p-2">
      <div>
        <Form form={form} onFinish={save} layout="vertical">
          <Form.Item hidden name="id">
            <Input />
          </Form.Item>
          <p className="text-[18px] font-bold">{t("Passing options")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls the settings of the test to pass")}</p>
          <div className="grid grid-cols-3 gap-8">
            <Form.Item name="passing_score" label={t("Passing score")}>
              <InputNumber suffix={"% score"} size="large" className="w-full!" />
            </Form.Item>

            <Form.Item name="time" label={t("Time limit")}>
              <InputNumber size="large" suffix="minutes" className="w-full!" />
            </Form.Item>

            <Form.Item name="retries_allowed" label={t("Retries allowed")}>
              <InputNumber suffix={""} className="w-full!" size="large" />
            </Form.Item>
          </div>
          <Divider />

          <p className="text-[18px] font-bold">{t("Question and Answers")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls the display and position of the questions and answers")}</p>

          <div className="grid grid-cols-3 gap-8">
            <Form.Item name="question_completion" label={t("Question Completion")} valuePropName="checked">
              <Checkbox size="large">{t("All Questions required to complete")}</Checkbox>
            </Form.Item>
            <Form.Item name="randomize_questions" label={t("Randomize Questions")} valuePropName="checked">
              <Switch size="large"></Switch>
            </Form.Item>
            <Form.Item name="randomize_answers" label={t("Randomize Answers")} valuePropName="checked">
              <Switch size="large" />
            </Form.Item>
          </div>
        </Form>

        <Button type="primary" size="large" onClick={form.submit} className="mt-4">
          Save
        </Button>
      </div>
    </div>
  );
}
