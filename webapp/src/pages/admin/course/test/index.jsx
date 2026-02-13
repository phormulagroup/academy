import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../../utils/context";

import endpoints from "../../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Button, Empty, Form, Input, InputNumber, Switch, Tabs } from "antd";
import Constructor from "../constructor";
import { useParams } from "react-router-dom";
import Settings from "./settings";
import Question from "./question";

export default function Test() {
  const { user, update } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const { t } = useTranslation();
  let { id, idTest } = useParams();

  const [form] = Form.useForm();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course.readByTestId, {
        params: { idTest },
      })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          res.data[0].question = res.data[0].question ? JSON.parse(res.data[0].question) : [];
          console.log(res.data[0]);
          form.setFieldsValue(res.data[0]);
          setData(res.data[0]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm">
            {t("Course")} | {data?.course_name}
          </p>
          <p className="text-xl font-bold mt-4">{data?.title}</p>
        </div>
      </div>
      <Tabs
        items={[
          {
            key: "1",
            label: t("Questions"),
            children: <Question data={data} />,
          },
          {
            key: "2",
            label: t("Settings"),
            children: <Settings />,
          },
        ]}
      />
    </div>
  );
}
