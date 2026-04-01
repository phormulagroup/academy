import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Dropdown, Tabs, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";
import { RxReload } from "react-icons/rx";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import CourseReport from "./courseReport";
import TestReport from "./testReport";
import StudentProgress from "./studentProgress";
import TestProgress from "./testProgress";

export default function Report() {
  const { user, selectedLanguage } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  const { t } = useTranslation();

  const navigate = useNavigate();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course.report, { params: { id_lang: selectedLanguage.id } })
      .then((res) => {
        setData(res.data);
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
          <p className="text-xl font-bold">{t("Reports")}</p>
        </div>
        <div>
          <Button size="large" onClick={getData} icon={<RxReload />} className="mr-2" />
        </div>
      </div>
      <div>
        <Tabs
          size="large"
          type="card"
          className="tabs-report"
          items={[
            {
              key: "1",
              label: t("Course reports"),
              forceRender: true,
              children: <CourseReport data={data} />,
            },
            {
              key: "2",
              label: t("Test reports"),
              forceRender: true,
              children: <TestReport data={data} />,
            },
          ]}
        />
      </div>
      <div className="mt-4">
        <Tabs
          size="large"
          type="card"
          className="tabs-report"
          items={[
            {
              key: "3",
              label: t("Students progress"),
              forceRender: true,
              children: <StudentProgress data={data} />,
            },
            {
              key: "4",
              label: t("Tests progress"),
              forceRender: true,
              children: <TestProgress data={data} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
