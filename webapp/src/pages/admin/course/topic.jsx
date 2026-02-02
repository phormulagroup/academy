import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Editor } from "../../../components/editor/Editor";

export default function Topic() {
  const { user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  const { t } = useTranslation();
  let { id, idTopic } = useParams();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.course.readByTopicId, {
        params: { id: idTopic },
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

  return <Editor />;
}
