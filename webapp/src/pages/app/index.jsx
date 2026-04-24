import axios from "axios";
import { useEffect, useState } from "react";
import { Avatar, Button, Collapse, Divider } from "antd";
import { FaRegUser } from "react-icons/fa";
import { useContext } from "react";
import { FaChevronRight, FaRegCheckCircle, FaRegCopy, FaRegEdit, FaRegFile, FaRegTimesCircle, FaRegTrashAlt } from "react-icons/fa";

import Table from "../../components/admin/table";
import { Context } from "../../utils/context";
import bialLogoAnimation from "../../assets/Bial-Academy-Logo-Animated.json";

import endpoints from "../../utils/endpoints";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../utils/i18n";
import { Helmet } from "react-helmet";
import Lottie from "lottie-react";

export default function Main() {
  const { user } = useContext(Context);
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-6 h-full">
      <Helmet>
        <meta charSet="utf-8" />
        <title>Bial Regional Academy</title>
        <meta name="description" content={`Bial Regional Academy`} />
        <meta property="og:title" content={`Bial Regional Academy`} />
        <meta property="og:description" content={`Bial Regional Academy`} />
      </Helmet>
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-4 h-full">
        <div className="flex flex-col justify-center h-full">
          <p className="text-[30px] font-bold">{t("Sobre Bial Regional Academy")}</p>
          <p className="italic">{t("Keeping training in mind")}</p>
          <br />
          <p>Bem vindo à BIAL Regional Academy, a plataforma de e-learning!</p>
          <br />
          <p>
            BIAL é uma empresa farmacêutica de inovação. Dedicados à investigação, desenvolvimento e comercialização de medicamentos, estamos empenhados em contribuir para a
            melhoria da qualidade de vida das pessoas em todo o mundo. <br />
            <br />
            BIAL rege-se por diversos valores: ao serviço da saúde, aposta na qualidade e na inovação, excelência da investigação científica, rigor, responsabilidade e trabalho em
            Equipa. <br />
            <br />
            Nesse sentido, apresentamos este site, acessível a colaboradores BIAL e aos seus profissionais de saúde, com a missão de proporcionar informação relevante dos produtos
            BIAL disponíveis em cada região. <br />
            <br />O objetivo do e-learning é permitir aos colaboradores BIAL o acesso fácil, conveniente, cómodo e direto aos conteúdos de Formação comercial e sobre os produtos
            BIAL. <br />
            <br />
            Desta forma, acreditamos que estamos a contribuir para a formação de equipas de excelência, bem preparadas, dotadas dos conhecimentos e das ferramentas certas para
            proporcionar mais e melhor informação aos profissionais de saúde e à comunidade em geral.
          </p>
          {Object.keys(user || {}).length === 0 && (
            <div className="flex items-center">
              <Link to={`/${i18n.language}/login`}>
                <Button type="primary" className="mt-6 min-w-[120px]" size="large">
                  {t("Login")}
                </Button>
              </Link>
              <Link to={`/${i18n.language}/register`}>
                <Button className="ml-2 mt-6 min-w-[120px]" size="large">
                  {t("Register")}
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex justify-center items-center">
          <Lottie animationData={bialLogoAnimation} loop={true} className="max-w-150" />
        </div>
      </div>
    </div>
  );
}
