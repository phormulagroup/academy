import { useEffect, useState } from "react";
import { Button } from "antd";
import { useContext } from "react";
import { Context } from "../../utils/context";

import { Link, useNavigate } from "react-router-dom";
import i18n from "../../utils/i18n";
import { Helmet } from "react-helmet";
import LottieAnim from "../../components/lottieAnimations";

import emergingMarket from "../../assets/Emerging-Markets.svg";

export default function Main() {
  const { user, personalization, t } = useContext(Context);
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (personalization?.json) {
      setData(JSON.parse(personalization.json));
    } else setData({});
  }, [personalization]);

  return (
    <div className="page-frame py-6 h-full">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Bial Regional Academy</title>
        <meta name="description" content={`Bial Regional Academy`} />
        <meta property="og:title" content={`Bial Regional Academy`} />
        <meta property="og:description" content={`Bial Regional Academy`} />
      </Helmet>
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6 lg:gap-10 h-full">
        <div className="flex flex-col justify-center h-full col-span-2">
          <p className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold leading-tight" style={{ color: "#163986" }}>
            {t("About Bial Regional Academy")}
          </p>
          <p className="italic text-base sm:text-lg lg:text-xl mt-1" style={{ color: "#163986" }}>
            {t("Keeping training in mind")}
          </p>
          {data?.text ? (
            <div
              className="homepage_text text-[13px] sm:text-sm lg:text-base"
              style={{ color: "#163986" }}
              dangerouslySetInnerHTML={{ __html: data.text }}
            />
          ) : (
            <div className="mt-4 text-[13px] sm:text-sm lg:text-base">
              <p>
                {t(
                  "Welcome to BIAL Regional Academy, the e-learning platform!",
                )}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 w-full!">
            {Object.keys(user || {}).length === 0 && (
              <div className="flex items-center">
                <Link to={`/${i18n.language}/login`}>
                  <Button type="primary" className="min-w-30 main-cta-button" size="large">
                    {t("Login")}
                  </Button>
                </Link>
                <Link to={`/${i18n.language}/register`}>
                  <Button className="ml-2 min-w-30 main-secondary-cta-button" size="large">
                    {t("Register")}
                  </Button>
                </Link>
              </div>
            )}
            <div
              className={`flex ${Object.keys(user || {}).length === 0 ? "justify-end" : "justify-start"} items-center w-full`}>
              <img src={emergingMarket} className="max-w-32 sm:max-w-40 lg:max-w-50" />
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center w-full max-w-60 sm:max-w-80 lg:max-w-none mx-auto">
          <LottieAnim loop={false} />
        </div>
      </div>
    </div>
  );
}
