import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Editor } from "../../../components/admin/editor";

export default function Topic() {
  const { toastApi } = useContext(Context);
  const [, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  const { t } = useTranslation();
  let { id: idCourse, idTopic } = useParams();
  const navigate = useNavigate();

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
        if (res.data && res.data.length > 0) setData(res.data[0]);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  // Devolve a promessa para o editor saber quando acabou de gravar (o botão Guardar volta a ficar desativado)
  function submit(obj) {
    return axios
      .post(endpoints.course.updateTopic, {
        data: { id: idTopic, content: JSON.stringify(obj) },
      })
      .then(() => {
        toastApi.open({ type: "success", content: t("Topic was successfully saved!") });
      })
      .catch((err) => {
        console.log(err);
        toastApi.open({ type: "error", content: t("Something went wrong, please try again") });
        throw err;
      });
  }

  return <Editor data={data} submit={submit} title={data?.title || data?.name} onExit={() => navigate(`/admin/courses/${idCourse}`)} />;
}
