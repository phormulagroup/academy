import { Navigate, Route, Routes, useParams, useRoutes } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Context } from "../utils/context";
import { useContext, useEffect } from "react";

import Loading from "../layout/loading";
import LoadingLanguage from "../layout/loadingLanguage";

import { adminRoutes } from "./routesAdmin";
import { userRoutes } from "./routesUser";
import { publicRoutes } from "./routesPublic";
import LanguageWrapper from "./languageWrapper";

export default function AppRoutes() {
  const { isLoggedIn, isLoading, isLoadingLanguage, user, languages } = useContext(Context);
  const { lang } = useParams();

  const finalRoutes = (() => {
    if (isLoading || isLoadingLanguage || !languages || languages.length === 0) return null;

    // PUBLIC
    if (!isLoggedIn || !user) {
      return [
        {
          path: ":lang",
          element: <LanguageWrapper />,
          children: publicRoutes,
        },
        {
          path: "*",
          element: <Navigate to={`/${lang}`} replace />,
        },
      ];
    }

    // ADMIN
    if (user.id_role === 1) {
      return [
        ...adminRoutes,
        {
          index: true,
          element: <Navigate to={`/${languages.filter((l) => l.id === user.id_lang)[0]?.code || "en"}`} replace />,
        },
        {
          path: ":lang",
          element: <LanguageWrapper />,
          children: userRoutes,
        },
      ];
    }

    // USER NORMAL
    return [
      {
        path: "/",
        element: <Navigate to={`/${languages.filter((l) => l.id === user.id_lang)[0]?.code || "en"}`} replace />,
      },
      {
        path: ":lang",
        element: <LanguageWrapper />,
        children: userRoutes,
      },
    ];
  })();

  const element = finalRoutes ? useRoutes(finalRoutes) : null;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#000000", fontFamily: "Poppins", blue: "#00b9d6" } }}>
      {isLoading ? <Loading /> : isLoadingLanguage ? <LoadingLanguage /> : element}
    </ConfigProvider>
  );
}
