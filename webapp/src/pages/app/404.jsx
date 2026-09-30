import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Button } from "antd";
import i18n from "../../utils/i18n";
import Lottie from "lottie-react";
import Error404Animation from "../../assets/Error-404.json";

export default function Error404() {
  const navigate = useNavigate();

  const { t } = useTranslation();

  return (
    <div className="page-frame py-6 mt-10">
      <Helmet>
        <meta charSet="utf-8" />
        <title>{t("Page not found")} - Bial Regional Academy</title>
        <meta
          name="description"
          content={`${t("Page not found")} 404 - Bial Regional Academy`}
        />
        <meta
          property="og:title"
          content={`${t("Page not found")} 404 - Bial Regional Academy`}
        />
        <meta
          property="og:description"
          content={`${t("Page not found")} 404 - Bial Regional Academy`}
        />
      </Helmet>
      <div className="flex flex-col justify-center items-center">
        <Lottie
          animationData={Error404Animation}
          loop={true}
          className="max-w-[300px]"
        />
        <p className="text-center">{t("Page not found")}</p>
        <Button
          type="primary"
          size="large"
          className="mx-auto mt-6 main-cta-button"
          onClick={() => navigate(`/${i18n.language}`, { replace: true })}>
          {t("Go back to homepage")}
        </Button>
      </div>
    </div>
  );
}
