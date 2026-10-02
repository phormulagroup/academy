import axios from "axios";
import BialSpin from "../../../components/bialSpin";
import { useEffect, useState } from "react";
import { Button, Empty } from "antd";
import { useContext } from "react";
import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link } from "react-router-dom";
import i18n from "../../../utils/i18n";
import config from "../../../utils/config";
import { getMarginClasses } from "../../../utils/responsive";
import useScrollToTop from "../../../utils/scrollToTop";
import { Helmet } from "react-helmet";
import { RxChevronUp } from "react-icons/rx";

export default function Document() {
  const { t, user, languages, windowDimension } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const { isVisible: showScrollToTop, scrollToTop } = useScrollToTop();

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.document.readByLang, {
        params: {
          id_lang:
            languages.find((l) => l.code === i18n.language)?.id ??
            user?.id_lang,
        },
      })
      .then((res) => {
        if (res.data.length > 0) {
          const filtered = res.data.filter((item) => {
            if (!item.country) return true;
            const arrCountries = JSON.parse(item.country);
            return (
              arrCountries.length === 0 || arrCountries.includes(user.country)
            );
          });

          setData(filtered);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  // Espera pelos idiomas (ao abrir/recarregar a página diretamente ainda não estão carregados)
  useEffect(() => {
    if (languages?.length > 0) getData();
  }, [user, languages]);

  return (
    <div className="bg-[#FFFFFF] relative">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("Documents")} - Bial Regional Academy</title>
        <meta
          name="description"
          content={`${t("Documents")} - Bial Regional Academy`}
        />
        <meta
          property="og:title"
          content={`${t("Documents")} - Bial Regional Academy`}
        />
        <meta
          property="og:description"
          content={`${t("Documents")} - Bial Regional Academy`}
        />
      </Helmet>
      <div className={`page-frame ${getMarginClasses(windowDimension)}`}>
        <div className="flex flex-col justify-center items-center mb-8 sm:mb-12 pb-2 sm:pb-4">
          <p className="font-ryker text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-center text-[#163986]">
            {t("Library of Documents")}
          </p>
          <p className="font-ryker italic text-center text-[14px] sm:text-[16px] lg:text-[18px] text-[#163986] mt-2 sm:mt-3">
            Keeping training in mind
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center w-full h-full col-span-3">
            <BialSpin />
          </div>
        ) : data && data.length > 0 ? (
          // Grelha comum aos catálogos (cursos, documentos, downloads): 1 coluna em telemóvel, 2 em sm/md, 3 em lg e 4 em xl
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 w-full">
            {data.map((d) => (
              <Link
                key={d.id}
                className="flex flex-col shadow-[0px_3px_6px_#00000029] rounded-[5px] cursor-pointer overflow-hidden hover:shadow-[0px_6px_12px_#00000040] transition-shadow"
                to={`/${i18n.language}/documents/${d.slug}`}>
                <div
                  // Thumbnails 800x600 (4:3): mesma proporção, a imagem não é cortada
                  className="bg-center bg-cover aspect-[4/3] w-full rounded-t-[5px]"
                  style={{
                    backgroundImage: `url(${config.server_ip}/media/${d.img})`,
                    backgroundColor: "rgba(0, 0, 0, 0.05)",
                    backgroundBlendMode: "overlay",
                  }}></div>
                <div className="px-2 py-2.5 sm:p-3 lg:p-4 min-h-[56px] sm:min-h-[80px] lg:min-h-[96px] flex justify-center items-center bg-[#C5CEE1]">
                  <p className="font-ryker font-bold text-[12px] sm:text-[14px] lg:text-[16px] text-[#163986] text-center leading-snug line-clamp-3 break-words">
                    {d.name}
                  </p>
                </div>
                <div className="p-2 sm:p-3 lg:p-4 flex flex-col gap-2 justify-end items-center flex-1">
                  <Button
                    size={windowDimension.width < 640 ? "middle" : "large"}
                    type="primary"
                    className="w-full main-cta-button text-[8px] sm:text-[12px] lg:text-[13px]"
                    style={{
                      fontSize:
                        windowDimension.width < 640 ? "11px" : "inherit",
                    }}>
                    {t("Read more")}
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center">
            <Empty description={t("No documents found")} />
          </div>
        )}
      </div>
      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          style={{ backgroundColor: "#FFC600" }}
          className="fixed! bottom-8 right-8 h-12! w-12! rounded-full! flex justify-center items-center shadow-lg! cursor-pointer hover:opacity-90 transition-opacity border-0"
          title={t("Scroll to top")}>
          <RxChevronUp className="w-6! h-6! text-black!" />
        </button>
      )}
    </div>
  );
}
