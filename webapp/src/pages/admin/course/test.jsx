import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { Tabs } from "antd";
import Constructor from "./constructor";
import { useParams } from "react-router-dom";
import Settings from "./settings";

export default function Test() {
  const { user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const { t } = useTranslation();
  let { id, idTest } = useParams();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course.readByQuizzId, {
        params: { idTest },
      })
      .then((res) => {
        console.log(res);
        if (res.data && res.data.length > 0) setData(res.data[0]);
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
      <div>{data?.name}</div>
    </div>
  );
}
