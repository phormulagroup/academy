import axios from "axios";
import { useEffect, useState } from "react";
import { Button, Empty } from "antd";
import { useContext } from "react";

import { Context } from "../../../utils/context";

import endpoints from "../../../utils/endpoints";
import { Link } from "react-router-dom";
import i18n from "../../../utils/i18n";
import config from "../../../utils/config";
import { getMarginClasses, getPaddingClasses } from "../../../utils/responsive";
import useScrollToTop from "../../../utils/scrollToTop";
import Lottie from "lottie-react";
import trailLoadingAnimation from "../../../assets/Trail-loading.json";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet";
import { RxChevronUp } from "react-icons/rx";

export default function Download() {
  const { user, languages, t: i18nT, windowDimension } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const { isVisible: showScrollToTop, scrollToTop } = useScrollToTop();

  const { t } = useTranslation();

  useEffect(() => {
    getData();
  }, []);

  function getData() {
    setIsLoading(true);
    axios
      .get(endpoints.download.readByLang, {
        params: {
          id_lang: languages.filter((l) => l.code === i18n.language)[0].id,
        },
      })
      .then((res) => {
        let downloads = res.data[0];

        const filtered = downloads.filter((d) => {
          if (!d.country) return true;
          const arrCountries = JSON.parse(d.country);

          d.items = res.data[1].filter((item) => item.id_download === d.id);
          return (
            arrCountries.length === 0 || arrCountries.includes(user.country)
          );
        });

        setData(filtered);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setIsLoading(false);
      });
  }

  return (
    <div className="bg-[#FFFFFF] relative">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("Downloads")} - Bial Regional Academy</title>
        <meta
          name="description"
          content={`${t("Downloads")} - Bial Regional Academy`}
        />
        <meta
          property="og:title"
          content={`${t("Downloads")} - Bial Regional Academy`}
        />
        <meta
          property="og:description"
          content={`${t("Downloads")} - Bial Regional Academy`}
        />
      </Helmet>
      <div
        className={`container mx-auto ${getPaddingClasses(windowDimension)} ${getMarginClasses(windowDimension)}`}>
        <div className="flex flex-col justify-center items-center mb-8 sm:mb-12 pb-2 sm:pb-4">
          <p className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-center text-[#163986]">
            {t("Downloads")}
          </p>
          <p className="italic text-center text-[14px] sm:text-[16px] lg:text-[18px] text-[#163986] mt-2 sm:mt-3">
            Keeping training in mind
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center w-full h-full col-span-3">
            <Lottie
              animationData={trailLoadingAnimation}
              loop={true}
              className="max-w-30"
            />
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full">
            {data.map((d) => (
              <Link
                key={d.id}
                className="flex flex-col shadow-[0px_3px_6px_#00000029] rounded-[5px] cursor-pointer overflow-hidden hover:shadow-[0px_6px_12px_#00000040] transition-shadow"
                to={`/${i18n.language}/downloads/${d.slug}`}>
                <div
                  className="bg-center bg-cover h-[200px] w-full rounded-t-[5px]"
                  style={{
                    backgroundImage: `url(${config.server_ip}/media/${d.thumbnail})`,
                    backgroundColor: "rgba(0, 0, 0, 0.05)",
                    backgroundBlendMode: "overlay",
                  }}></div>
                <div className="p-6 min-h-[120px] flex justify-center items-center bg-[#C5CEE1]">
                  <p className="font-bold text-[13px] sm:text-[15px] lg:text-[18px] text-[#163986] text-center line-clamp-3">
                    {d.name}
                  </p>
                </div>
                <div className="p-6 flex flex-col gap-2 justify-between items-center flex-1">
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
            <Empty description={t("No downloads found")} />
          </div>
        )}
      </div>
      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          style={{ backgroundColor: "#FFC600" }}
          className="fixed! bottom-8 right-8 h-12! w-12! rounded-full! flex justify-center items-center shadow-lg! cursor-pointer hover:opacity-90 transition-opacity border-0"
          title="Scroll to top">
          <RxChevronUp className="w-6! h-6! text-black!" />
        </button>
      )}
    </div>
  );
}
