import { useContext } from "react";

import { Context } from "../utils/context";

import { Spin } from "antd";
import { useTranslation } from "react-i18next";
import i18n from "../utils/i18n";

const LoadingLanguage = () => {
  const { isLoadingLanguage, languages } = useContext(Context);
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col justify-center items-center w-full h-full bg-cover bg-center`}>
      <div className="max-w-112.5 w-full min-h-75 bg-white rounded-[5px] shadow-[0px_3px_6px_#00000029]">
        <div className="flex flex-col justify-center items-center h-full p-4">
          <Spin spinning={isLoadingLanguage} />
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
