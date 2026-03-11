import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";

import endpoints from "../../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, DatePicker, Divider, Empty, Form, Input, InputNumber, Switch, Tabs } from "antd";
import Constructor from "../constructor";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

export default function Settings({ data }) {
  const { user, update } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);

  const { t } = useTranslation();
  let { id, idTest } = useParams();

  const [form] = Form.useForm();

  useEffect(() => {
    if (data?.settings && Object.keys(data.settings).length > 0) {
      form.setFieldsValue(data.settings);
    }
  }, [data]);

  async function save(values) {
    try {
      console.log(values);
      const res = await update({ table: "test", data: { settings: JSON.stringify(values), id: idTest } });
      console.log(res);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className="p-2">
      <div>
        <Form form={form} onFinish={save} layout="vertical">
          <p className="text-[18px] font-bold">{t("Access")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls the acces settings of the test")}</p>
          <div className="grid grid-cols-3 gap-8">
            <Form.Item name="access_date" label={t("Access date")} getValueProps={(value) => ({ value: value && dayjs(value) })}>
              <DatePicker format="YYYY-MM-DD HH:mm" showTime size="large" className="w-full" />
            </Form.Item>
          </div>
          <Divider />
          <p className="text-[18px] font-bold">{t("Passing options")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls the settings of the test to pass")}</p>
          <div className="grid grid-cols-3 gap-8">
            <Form.Item name="passing_score" label={t("Passing score")}>
              <InputNumber suffix={"%"} size="large" className="w-full!" />
            </Form.Item>

            <Form.Item name="time" label={t("Time limit")}>
              <InputNumber size="large" suffix="min" className="w-full!" />
            </Form.Item>

            <Form.Item name="retries_allowed" label={t("Retries allowed")}>
              <InputNumber className="w-full!" size="large" />
            </Form.Item>
          </div>
          <Divider />

          <p className="text-[18px] font-bold">{t("Question and Answers")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls the display and position of the questions and answers")}</p>

          <div className="grid grid-cols-3 gap-8">
            <Form.Item name="randomize_questions" label={t("Randomize Questions")} valuePropName="checked">
              <Switch size="large"></Switch>
            </Form.Item>
            <Form.Item name="randomize_answers" label={t("Randomize Answers")} valuePropName="checked">
              <Switch size="large" />
            </Form.Item>
          </div>
          <Divider />

          <p className="text-[18px] font-bold">{t("Results")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">{t("Controls what you wanna show after complete the test")}</p>

          <div className="grid grid-cols-3 gap-8">
            <Form.Item name="show_correct_answers" label={t("Show correct answers")} valuePropName="checked">
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
