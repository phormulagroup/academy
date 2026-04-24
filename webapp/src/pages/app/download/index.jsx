import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider, Empty } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../../components/admin/table";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link, useNavigate } from "react-router-dom";
import i18n from "../../../utils/i18n";
import config from "../../../utils/config";
import Lottie from "lottie-react";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet";

export default function Download() {
  const { user, courses, languages } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.download.readByLang, {
        params: { id_lang: languages.filter((l) => l.code === i18n.language)[0].id },
      })
      .then((res) => {
        let downloads = res.data[0];
        for (let i = 0; i < downloads.length; i++) {
          downloads[i].items = res.data[1].filter((item) => item.id_download === downloads[i].id);
        }

        setData(downloads);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  return (
    <div className="container mx-auto p-6 flex flex-col justify-start items-center mt-10">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("Downloads")} - Bial Regional Academy</title>
        <meta name="description" content={`${t("Downloads")} - Bial Regional Academy`} />
        <meta property="og:title" content={`${t("Downloads")} - Bial Regional Academy`} />
        <meta property="og:description" content={`${t("Downloads")} - Bial Regional Academy`} />
      </Helmet>
      <div className="flex flex-col mb-10">
        <p className="text-[30px] font-bold text-center">{t("Downloads")}</p>
        <p className="italic text-center">Keeping training in mind</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full col-span-3">
          <Lottie animationData={trailLoadingAnimation} loop={true} className="max-w-30" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full">
          {data.map((d) => (
            <Link className="flex flex-col shadow-[0px_3px_6px_#00000029] rounded-[5px] cursor-pointer" to={`/${i18n.language}/downloads/${d.slug}`}>
              <div className="bg-center bg-cover h-50 w-full rounded-t-[5px]" style={{ backgroundImage: `url(${config.server_ip}/media/${d.thumbnail})` }}></div>
              <div className="p-6 min-h-30 flex justify-center items-center bg-[#C5CEE1]">
                <p className="text-lg font-semibold text-[#163986] text-center">{d.name}</p>
              </div>
              <div className="p-6 flex flex-col gap-2 justify-between items-center">
                <Button size="large" type="primary" className="w-full">
                  Read more
                </Button>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <Empty description="No downloads found" />
        </div>
      )}
    </div>
  );
}
