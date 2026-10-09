import axios from "axios";
import { useCallback, useEffect } from "react";
import { useState } from "react";

import endpoints from "../../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Form, Tabs } from "antd";
import { useParams } from "react-router-dom";
import Settings from "./settings";
import Question from "./question";

export default function Test() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  // Separador ativo: o rodapé fixo das perguntas só aparece no separador das perguntas
  const [activeTab, setActiveTab] = useState("1");

  const { t } = useTranslation();
  const { idTest } = useParams();
  const [form] = Form.useForm();

  const getData = useCallback(() => {
    setIsLoading(true);
    axios
      .get(endpoints.course.readByTestId, {
        params: { idTest },
      })
      .then((res) => {
        if (res.data && res.data.length > 0) {
          res.data[0].question = res.data[0].question ? JSON.parse(res.data[0].question) : [];
          res.data[0].settings = res.data[0].settings ? JSON.parse(res.data[0].settings) : {};          
          form.setFieldsValue(res.data[0]);
          setData(res.data[0]);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log("❌ [getData] Error:", err);
        setIsLoading(false);
      });
  }, [idTest, form]);

  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm font-ryker">
            {t("Course")} | {data?.course_name}
          </p>
          <p className="text-xl font-bold mt-4 font-ryker">{data?.title}</p>
        </div>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "1",
            label: t("Questions"),
            children: <Question data={data} onSaveSuccess={getData} isLoading={isLoading} isActive={activeTab === "1"} />,
          },
          {
            key: "2",
            label: t("Settings"),
            children: <Settings data={data} />,
          },
        ]}
      />
    </div>
  );
}
