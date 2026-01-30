import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Tabs } from "antd";
import Constructor from "./constructor";
import { useParams } from "react-router-dom";

export default function CourseDetails() {
  const { user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  const { t } = useTranslation();
  let { id } = useParams();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course.readById, {
        params: { id },
      })
      .then((res) => {
        console.log(res);
        if (res.data.course && res.data.course.length > 0) setData(res.data.course[0]);
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
          <p className="text-xl font-bold">{data?.name}</p>
        </div>
      </div>
      <div>
        <Tabs
          items={[
            {
              key: "1",
              label: t("Constructor"),
              children: <Constructor course={data} />,
            },
            {
              key: "2",
              label: t("Settings"),
              children: "Content of Tab Pane 2",
            },
          ]}
        />
      </div>
    </div>
  );
}
