import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegFile, FaRegUser } from "react-icons/fa";
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
import { Helmet } from "react-helmet";

export default function DownloadDetails({ themePreference = "light" }) {
  const { user, courses, languages, createLog } = useContext(Context);
  const [data, setData] = useState(null);

  const viewerRef = useRef(null);

  const navigate = useNavigate();
  const { slug } = useParams();
  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    axios
      .get(endpoints.download.readBySlug, {
        params: { slug, id_lang: languages.filter((l) => l.code === i18n.language)[0].id },
      })
      .then((res) => {
        if (res.data.download) {
          res.data.download.items = res.data.items;
        }

        setData(res.data.download || null);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  async function preview(item) {
    try {
      window.open(`${config.server_ip}/media/${item.file}`, "_blank");
      const res = await axios.post(endpoints.download.preview, { data: item });
      await createLog({ id_user: user.id, action: "view", table_name: "download" });
    } catch (e) {
      console.log(e);
    }
  }

  async function download(item) {
    try {
      const response = await axios.get(`${config.server_ip}/media/${item.file}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = item.file; // nome do ficheiro
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      const res = await axios.post(endpoints.download.download, { data: item });
      await createLog({ id_user: user.id, action: "download", table_name: "download" });
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <div className="container mx-auto p-6">
      {data ? (
        <div>
          <Helmet>
            <meta charSet="utf-8" />
            <title>{data.name} - Bial Regional Academy</title>
            <meta name="description" content={`${data.name} - Bial Regional Academy`} />
            <meta property="og:title" content={`${data.name} - Bial Regional Academy`} />
            <meta property="og:description" content={`${data.name} - Bial Regional Academy`} />
          </Helmet>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[24px] font-bold">{data?.name}</p>
            <Button size="large" type="text" icon={<AiOutlineArrowLeft />} onClick={() => navigate(`/${i18n.language}/downloads`, { replace: true })}>
              {t("Back to downloads")}
            </Button>
          </div>
          <div className="w-full overflow-hidden mx-auto">
            <img src={`${config.server_ip}/media/${data.banner}`} alt={data.name} className="w-full h-full object-cover rounded" />
          </div>
          <p className="mt-4">{data.description}</p>
          <Divider />
          <p className="text-lg font-semibold mb-2">{t("Files")}</p>
          <div className="flex flex-col gap-4">
            {data.items.map((item) => (
              <div
                key={item.id}
                href={`${config.server_ip}/media/${item.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between items-center gap-3 p-4 border rounded hover:bg-gray-100 transition-colors shadow-md"
              >
                <div className="flex">
                  <FaRegFile size={24} />
                  <p className="ml-2">{item.name}</p>
                </div>
                <div className="flex">
                  <Button size="large" type="primary" onClick={() => download(item)}>
                    {t("Download")}
                  </Button>
                  <Button className="ml-2" size="large" onClick={() => preview(item)}>
                    {t("Preview")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <Helmet>
            <meta charSet="utf-8" />
            <title>Download not found - Bial Regional Academy</title>
            <meta name="description" content={`Download not found - Bial Regional Academy`} />
            <meta property="og:title" content={`Download not found} - Bial Regional Academy`} />
            <meta property="og:description" content={`Download not found - Bial Regional Academy`} />
          </Helmet>
          <p>{t("Download not found")}</p>
        </div>
      )}
    </div>
  );
}
