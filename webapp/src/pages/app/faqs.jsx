import axios from "axios";
import BialSpin from "../../components/bialSpin";
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

import { Helmet } from "react-helmet";

export default function Faqs() {
  const { languages, user } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState(null);
  const [pageSize] = useState(5);

  const { t } = useTranslation();

  // Espera pelos idiomas (ao abrir/recarregar a página diretamente ainda não estão carregados)
  useEffect(() => {
    if (languages?.length > 0) getData();
  }, [languages?.length > 0]);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.faqs.readByLang, { params: { id_lang: (languages.find((l) => l.code === i18n.language)?.id ?? user?.id_lang) } })
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
    <div className="page-frame py-6 flex flex-col justify-start items-center mt-4 sm:mt-10">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("FAQs")} - Bial Regional Academy</title>
        <meta name="description" content={`${t("FAQs")} - Bial Regional Academy`} />
        <meta property="og:title" content={`${t("FAQs")} - Bial Regional Academy`} />
        <meta property="og:description" content={`${t("FAQs")} - Bial Regional Academy`} />
      </Helmet>
      <div className="flex flex-col mb-6 sm:mb-10">
        <p className="font-ryker text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-center text-[#163986]">{t("FAQs")}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full">
          <BialSpin />
        </div>
      ) : data && data.length > 0 ? (
        <div className="w-full flex flex-col justify-center items-center">
          <Collapse
            className="w-full collapse-accordion"
            size="large"
            bordered={false}
            items={data.map((n) => {
              console.log(n.images);
              if (n.images && typeof n.images === "string") n.images = JSON.parse(n.images);
              return {
                key: n.id,
                label: (
                  <p className="font-ryker text-xs sm:text-sm md:text-base">{n.title}</p>
                ),
                children: (
                  <div className="flex justify-center gap-4 lg:gap-8 w-full flex-wrap lg:flex-nowrap">
                    <div className="text-xs sm:text-sm md:text-base" dangerouslySetInnerHTML={{ __html: n.description }} />
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
