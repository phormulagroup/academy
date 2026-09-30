import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";

import { Button, DatePicker, Divider, Form, InputNumber, Switch } from "antd";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";

export default function Settings({ data }) {
  const { update, t } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);

  let { id, idTest } = useParams();

  const [form] = Form.useForm();

  useEffect(() => {
    const formValues = {};

    if (data?.settings && Object.keys(data.settings).length > 0) {
      Object.assign(formValues, data.settings);
    }

    if (data?.status) {
      formValues.status = data.status;
    }

    if (Object.keys(formValues).length > 0) {
      form.setFieldsValue(formValues);
    }
  }, [data]);

  async function save(values) {
    try {
      console.log(values);
      const { status, ...settings } = values;

      const res = await update({
        table: "test",
        data: {
          status: status,
          settings: JSON.stringify(settings),
          id: idTest,
        },
      });
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
          <p className="text-[12px] italic mb-4 text-[#666]">
            {t("Controls the acces settings of the test")}
          </p>
          <div className="grid grid-cols-3 gap-8">
            <Form.Item
              name="start_date"
              label={t("Access date")}
              getValueProps={(value) => ({ value: value && dayjs(value) })}>
              <DatePicker
                format="YYYY-MM-DD HH:mm"
                showTime
                size="large"
                className="w-full"
              />
            </Form.Item>
            <Form.Item
              name="end_date"
              label={t("Access date")}
              getValueProps={(value) => ({ value: value && dayjs(value) })}>
              <DatePicker
                format="YYYY-MM-DD HH:mm"
                showTime
                size="large"
                className="w-full"
              />
            </Form.Item>
          </div>
          <Divider />
          <p className="text-[18px] font-bold">{t("Passing options")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">
            {t("Controls the settings of the test to pass")}
          </p>
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

          <p className="text-[18px] font-bold">{t("Status")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">
            {t(
              "Controls the status of the test if it will be showed on course page",
            )}
          </p>

          <div className="grid grid-cols-3 gap-8">
            <Form.Item
              name="status"
              valuePropName="checked"
              getValueProps={(value) => ({
                checked: value === "published",
              })}
              normalize={(checked) => (checked ? "published" : "draft")}>
              <Switch
                size="large"
                checkedChildren={t("Published")}
                unCheckedChildren={t("Draft")}></Switch>
            </Form.Item>
          </div>

          <Divider />

          <p className="text-[18px] font-bold">{t("Question and Answers")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">
            {t(
              "Controls the display and position of the questions and answers",
            )}
          </p>

          <div className="grid grid-cols-3 gap-8">
            <Form.Item
              name="randomize_questions"
              label={t("Randomize Questions")}
              valuePropName="checked">
              <Switch
                size="large"
                checkedChildren={t("Yes")}
                unCheckedChildren={t("No")}></Switch>
            </Form.Item>
            <Form.Item
              name="randomize_answers"
              label={t("Randomize Answers")}
              valuePropName="checked">
              <Switch
                size="large"
                checkedChildren={t("Yes")}
                unCheckedChildren={t("No")}
              />
            </Form.Item>
          </div>
          <Divider />

          <p className="text-[18px] font-bold">{t("Results")}</p>
          <p className="text-[12px] italic mb-4 text-[#666]">
            {t("Controls what you wanna show after complete the test")}
          </p>

          <div className="grid grid-cols-3 gap-8">
            <Form.Item
              name="show_correct_answers"
              label={t("Show correct answers")}
              valuePropName="checked">
              <Switch
                size="large"
                checkedChildren={t("Yes")}
                unCheckedChildren={t("No")}
              />
            </Form.Item>
          </div>
        </Form>

        <Button
          type="primary"
          size="large"
          onClick={form.submit}
          className="mt-4">
          Save
        </Button>
      </div>
    </div>
  );
}
