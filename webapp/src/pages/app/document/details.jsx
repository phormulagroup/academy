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
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";
import { PDFViewer, ScrollStrategy, ZoomMode } from "@embedpdf/react-pdf-viewer";

export default function DocumentDetails({ themePreference = "light" }) {
  const { user, courses, languages } = useContext(Context);
  const [data, setData] = useState(null);

  const viewerRef = useRef(null);

  const navigate = useNavigate();
  const { slug } = useParams();
  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  // Update theme when preference changes
  useEffect(() => {
    viewerRef.current?.container?.setTheme({ preference: themePreference });
  }, [themePreference]);

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
          <div className="max-w-[1200px] h-[700px] w-full overflow-hidden mx-auto" ref={viewerRef}>
            <PDFViewer
              key={data?.file}
              config={{
                //src: `${config.server_ip}/media/${data?.file}`,
                src: `${config.server_ip}/media/${data?.file}`,
                zoom: {
                  defaultZoomLevel: ZoomMode.FitWidth, // or a number like 1.5
                },
                scroll: {
                  defaultStrategy: ScrollStrategy.Horizontal, // or ScrollStrategy.Horizontal
                  defaultPageGap: 5,
                },

                // Esconder TODA a UI
                disabledCategories: ["annotation", "panel-search", "panel-comment", "document", "form", "insert", "redaction"],

                theme: {
                  preference: "light",
                },
              }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
      ) : (
        <p>{t("Document not found")}</p>
      )}
    </div>
  );
}
