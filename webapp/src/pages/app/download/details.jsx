import axios from "axios";
import { useEffect, useState } from "react";
import { Button } from "antd";
import {
  FaRegFile,
  FaRegFileAlt,
  FaRegFileArchive,
  FaRegFileAudio,
  FaRegFileExcel,
  FaRegFileImage,
  FaRegFilePdf,
  FaRegFilePowerpoint,
  FaRegFileVideo,
  FaRegFileWord,
} from "react-icons/fa";
import { useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "react-router-dom";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import i18n from "../../../utils/i18n";

import config from "../../../utils/config";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import Lottie from "lottie-react";

// Tipo de ficheiro pela extensão: ícone/cor na lista e forma de pré-visualizar
const FILE_TYPES = [
  { ext: /\.pdf$/i, Icon: FaRegFilePdf, color: "#E53935", preview: "browser" },
  {
    ext: /\.(pptx?|ppsx?)$/i,
    Icon: FaRegFilePowerpoint,
    color: "#D24726",
    preview: "pdf-version",
  },
  { ext: /\.docx?$/i, Icon: FaRegFileWord, color: "#2B579A", preview: null },
  { ext: /\.xlsx?$/i, Icon: FaRegFileExcel, color: "#217346", preview: null },
  {
    ext: /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i,
    Icon: FaRegFileImage,
    color: "#00B9D6",
    preview: "browser",
  },
  {
    ext: /\.(mp4|webm|mov)$/i,
    Icon: FaRegFileVideo,
    color: "#7B1FA2",
    preview: "browser",
  },
  {
    ext: /\.(mp3|wav|ogg)$/i,
    Icon: FaRegFileAudio,
    color: "#7B1FA2",
    preview: "browser",
  },
  {
    ext: /\.(zip|rar|7z)$/i,
    Icon: FaRegFileArchive,
    color: "#795548",
    preview: null,
  },
  {
    ext: /\.(txt|csv)$/i,
    Icon: FaRegFileAlt,
    color: "#163986",
    preview: "browser",
  },
];
const getFileType = (file) =>
  FILE_TYPES.find((t) => t.ext.test(file || "")) || {
    Icon: FaRegFile,
    color: "#163986",
    preview: null,
  };

// URL que o Preview abre: um PowerPoint é pré-visualizado pela sua versão PDF, com exatamente o mesmo nome
// (ex.: 02_Kit.pptx -> 02_Kit.pdf), guardada no media; os restantes formatos pré-visualizáveis abrem diretamente
const pdfVersionOf = (file) => file.replace(/\.[^.]+$/, ".pdf");
function previewUrl(item) {
  const mode = getFileType(item.file).preview;
  if (mode === "pdf-version")
    return `${config.server_ip}/media/${pdfVersionOf(item.file)}`;
  return mode ? `${config.server_ip}/media/${item.file}` : null;
}

export default function DownloadDetails({ themePreference = "light" }) {
  const { user, courses, languages, createLog } = useContext(Context);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
        params: {
          slug,
          id_lang: languages.filter((l) => l.code === i18n.language)[0].id,
        },
      })
      .then((res) => {
        if (res.data.download) {
          let item = res.data.download;
          item.country = item.country ? JSON.parse(item.country) : null;

          if (item.country && !item.country.includes(user.country)) {
            setData(null);
            setIsLoading(false);
            return;
          }
          res.data.download.items = res.data.items;
          setData(res.data.download);
        } else {
          setData(null);
        }

        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  async function preview(item) {
    try {
      window.open(previewUrl(item), "_blank");
      const res = await axios.post(endpoints.download.preview, { data: item });
      await createLog({
        id_user: user.id,
        action: "view",
        table_name: "download",
      });
    } catch (e) {
      console.log(e);
    }
  }

  async function download(item) {
    try {
      const response = await axios.get(
        `${config.server_ip}/media/${item.file}`,
        {
          responseType: "blob",
        },
      );

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
      await createLog({
        id_user: user.id,
        action: "download",
        table_name: "download",
      });
    } catch (e) {
      console.log(e);
    }
  }

  return (
    <div className="page-frame py-6">
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full col-span-3">
          <Lottie
            animationData={trailLoadingAnimation}
            loop={true}
            className="max-w-30"
          />
        </div>
      ) : data ? (
        <div>
          <Helmet>
            <meta charSet="utf-8" />
            <title>{data.name} - Bial Regional Academy</title>
            <meta
              name="description"
              content={`${data.name} - Bial Regional Academy`}
            />
            <meta
              property="og:title"
              content={`${data.name} - Bial Regional Academy`}
            />
            <meta
              property="og:description"
              content={`${data.name} - Bial Regional Academy`}
            />
          </Helmet>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[24px] font-bold">{data?.name}</p>
            <Button
              size="large"
              type="text"
              icon={<AiOutlineArrowLeft />}
              onClick={() =>
                navigate(`/${i18n.language}/downloads`, { replace: true })
              }>
              {t("Back to downloads")}
            </Button>
          </div>
          {/* Em ecrã largo: imagem com 40–50% da largura (máx. 576 px) e os ficheiros ao lado (visíveis sem scroll);
              em telemóvel a imagem fica por cima, com largura máxima */}
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-full max-w-md mx-auto md:mx-0 md:max-w-xl md:w-1/2 lg:w-2/5 shrink-0">
              <img
                src={`${config.server_ip}/media/${data.banner}`}
                alt={data.name}
                className="w-full aspect-4/3 object-cover rounded shadow-md"
              />
              {data.description && <p className="mt-4">{data.description}</p>}
            </div>

            <div className="w-full md:flex-1 min-w-0">
              <p className="text-lg font-semibold mb-3">
                {t("Files")}{" "}
                <span className="text-sm font-normal text-gray-500">
                  ({data.items.length})
                </span>
              </p>
              <div className="flex flex-col gap-3">
                {data.items.map((item) => {
                  const { Icon, color } = getFileType(item.file);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center md:flex-col md:items-stretch justify-between gap-3 p-4 border rounded hover:bg-gray-100 transition-colors shadow-md">
                      <div className="flex items-center min-w-0">
                        <Icon size={24} color={color} className="shrink-0" />
                        <p className="ml-2 break-words">{item.name}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button className="main-cta-button"
                          size="large"
                          type="primary"
                          onClick={() => download(item)}>
                          {t("Download")}
                        </Button>
                        {previewUrl(item) && (
                          <Button size="large" onClick={() => preview(item)}>
                            {t("Preview")}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Helmet>
            <meta charSet="utf-8" />
            <title>Download not found - Bial Regional Academy</title>
            <meta
              name="description"
              content={`Download not found - Bial Regional Academy`}
            />
            <meta
              property="og:title"
              content={`Download not found} - Bial Regional Academy`}
            />
            <meta
              property="og:description"
              content={`Download not found - Bial Regional Academy`}
            />
          </Helmet>
          <p>{t("Download not found")}</p>
        </div>
      )}
    </div>
  );
}
