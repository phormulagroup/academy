import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { useNavigate, useParams } from "react-router-dom";
import i18n from "../../../utils/i18n";

import { useRef } from "react";
import config from "../../../utils/config";
import { useTranslation } from "react-i18next";
import { AiOutlineArrowLeft } from "react-icons/ai";

export default function DocumentDetails() {
  const { user, courses, languages } = useContext(Context);
  const [data, setData] = useState(null);

  const containerRef = useRef(null);

  const navigate = useNavigate();
  const { slug } = useParams();
  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    axios
      .get(endpoints.document.readBySlug, {
        params: { slug, id_lang: languages.filter((l) => l.code === i18n.language)[0].id },
      })
      .then((res) => {
        console.log(res);
        setData(res.data[0] || null);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <div className="container mx-auto p-6">
      {data ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[24px] font-bold">{data?.name}</p>
            <Button type="text" icon={<AiOutlineArrowLeft />} onClick={() => navigate(`/${i18n.language}/documents`)}>
              {t("Back to documents")}
            </Button>
          </div>
          <iframe
            title="PowerPoint"
            src={`https://view.officeapps.live.com/op/embed.aspx?src=https://geccpapi.phormuladev.com/media/Presentation1.pptx`}
            className="w-full h-[500px]"
            frameBorder="0"
          />
        </div>
      ) : (
        <p>{t("Document not found")}</p>
      )}
    </div>
  );
}
