import { useContext } from "react";

import { Context } from "../utils/context";
import bgLogin from "../assets/Background-login.png";
import trailLoadingAnimation from "../assets/Trail-loading.json";

import { Spin } from "antd";
import { useTranslation } from "react-i18next";
import i18n from "../utils/i18n";
import Lottie from "lottie-react";

const LoadingLanguage = () => {
  const { isLoadingLanguage, languages } = useContext(Context);
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col justify-center items-center w-full h-full bg-[#F7F7F7] bg-contain bg-right bg-no-repeat`} style={{ backgroundImage: `url(${bgLogin})` }}>
      <div className="max-w-112.5 w-full min-h-75 bg-white rounded-[5px] shadow-[0px_3px_6px_#00000029]">
        <div className="flex flex-col justify-center items-center h-full p-4">
          <Lottie animationData={trailLoadingAnimation} loop={true} className="max-w-30" />
          <p className="mt-4">{t("Loading the selected language")}...</p>
          {languages.filter((l) => l.code === i18n.language).length > 0 && (
            <div className="flex justify-center items-center mt-4">
              <img src={languages.filter((l) => l.code === i18n.language)[0].flag} className="max-w-7 mr-2" />
              <p>{languages.filter((l) => l.code === i18n.language)[0].name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LoadingLanguage;
