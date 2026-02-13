import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";

import endpoints from "../../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Empty, Form, Input, InputNumber, Switch, Tabs } from "antd";
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
        <Form form={form} onFinish={save}>
          <Form.Item hidden name="id">
            <Input />
          </Form.Item>

          <Form.Item name="passing_score" label={t("Passing score")}>
            <InputNumber suffix={"% score"} />
          </Form.Item>

          <Form.Item name="restrict_test_retakes" label={t("Restrict test retakes")} valuePropName="checked">
            <Switch size="large" />
          </Form.Item>

          <Form.Item name="retries_allowed" label={t("Retries allowed")}>
            <InputNumber suffix={"% score"} />
          </Form.Item>

          <Form.Item name="question_completion" label={t("Question Completion")} valuePropName="checked">
            <Checkbox size="large">{t("All Questions required to complete")}</Checkbox>
          </Form.Item>

          <Form.Item name="time" label={t("Time limit")}>
            <InputNumber size="large" suffix="minutes" />
          </Form.Item>

          <Form.Item name="randomize_questions" label={t("Randomize questions")} valuePropName="checked">
            <Switch size="large" />
          </Form.Item>

          <Form.Item name="quizz_material" label={t("Quizz materials")} valuePropName="checked">
            <Switch size="large" />
          </Form.Item>
        </Form>

        <Button onClick={form.submit}>Save</Button>
      </div>
    </div>
  );
}
