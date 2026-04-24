import axios from "axios";
import { useContext, useEffect } from "react";
import { useState } from "react";
import { Button, Collapse, Dropdown, Empty, Image, Pagination, Tag } from "antd";
import { IoMdMore } from "react-icons/io";
import { FaArrowAltCircleRight, FaRegEdit, FaRegFile, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import Create from "../../components/admin/notification/create";
import Update from "../../components/admin/notification/update";
import Delete from "../../components/admin/delete";

import { Context } from "../../utils/context";

import endpoints from "../../utils/endpoints";
import { AiOutlinePlus } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import { RxReload } from "react-icons/rx";
import dayjs from "dayjs";
import NotificationIcon from "../../assets/Notifications-off.svg?react";
import { RiCloseCircleLine } from "react-icons/ri";
import i18n from "../../utils/i18n";
import config from "../../utils/config";

import trailLoadingAnimation from "../../assets/Trail-loading.json";
import Lottie from "lottie-react";
import { Helmet } from "react-helmet";

export default function Faqs() {
  const { languages, user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState(null);
  const [pageSize] = useState(5);

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.faqs.readByLang, { params: { id_lang: languages.filter((_l) => _l.code === i18n.language)[0].id } })
      .then((res) => {
        console.log(res);
        setData(res.data);
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
        <title>{t("FAQs")} - Bial Regional Academy</title>
        <meta name="description" content={`${t("FAQs")} - Bial Regional Academy`} />
        <meta property="og:title" content={`${t("FAQs")} - Bial Regional Academy`} />
        <meta property="og:description" content={`${t("FAQs")} - Bial Regional Academy`} />
      </Helmet>
      <div className="flex flex-col mb-10">
        <p className="text-[30px] font-bold text-center">{t("FAQs")}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full">
          <Lottie animationData={trailLoadingAnimation} loop={true} className="max-w-30" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="w-full flex flex-col justify-center items-center">
          <Collapse
            className="w-full"
            items={data.map((n) => {
              console.log(n.images);
              if (n.images && typeof n.images === "string") n.images = JSON.parse(n.images);
              return {
                key: n.id,
                label: n.title,
                children: (
                  <div className="flex justify-center gap-8 p-4 bg-white w-full flex-wrap lg:flex-nowrap">
                    <div className="text-[14px]" dangerouslySetInnerHTML={{ __html: n.description }} />
                    {n.images && n.images.length > 0 && (
                      <div className="flex flex-col gap-4 max-w-[240px]">
                        {n.images.map((im) => (
                          <Image
                            width={"100%"}
                            alt={im.img}
                            src={`${config.server_ip}/media/${im.img}`}
                            preview={{
                              mask: { blur: true },
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        </div>
      ) : (
        <Empty />
      )}
    </div>
  );
}
