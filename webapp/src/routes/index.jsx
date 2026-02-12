import { Navigate, Route, Routes, useRoutes } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Context } from "../utils/context";
import { useContext } from "react";

import Loading from "../layout/loading";
import LoadingLanguage from "../layout/loadingLanguage";

import { adminRoutes } from "./routesAdmin";
import { userRoutes } from "./routesUser";
import { publicRoutes } from "./routesPublic";

export default function AppRoutes() {
  const { isLoggedIn, isLoading, isLoadingLanguage, user } = useContext(Context);

  const finalRoutes = (() => {
    if (isLoading) return null;
    if (isLoadingLanguage) return null;

    if (!isLoggedIn || !user) {
      return publicRoutes;
    }

    if (user.id_role === 1) {
      // ADMIN vê admin + user routes
      return [...adminRoutes, ...userRoutes];
    }

    // User normal
    return userRoutes;
  })();

  const element = finalRoutes ? useRoutes(finalRoutes) : null;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#000000",
          fontFamily: "Poppins",
        },
      }}
    >
      {isLoading ? <Loading /> : isLoadingLanguage ? <LoadingLanguage /> : element}
    </ConfigProvider>
  );
}
