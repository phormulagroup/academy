import { Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Context } from "./context";
import { useContext } from "react";
import { MsalProvider } from "@azure/msal-react";

import Loading from "../layout/loading";
import Login from "../pages/auth/login";
import Main from "../pages/main/main";
import MainLayout from "../layout/index";
import Course from "../pages/main/course";
import User from "../pages/main/user";
import GeneratePassword from "../pages/auth/generatePassword";

export default function AppRoutes() {
  const { isLoggedIn, isLoading, user } = useContext(Context);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#0c3c61",
          fontFamily: "Poppins",
        },
      }}
    >
      {isLoading ? (
        <Loading />
      ) : (
        <Routes>
          {isLoggedIn && user ? (
            <>
              <Route element={<MainLayout />}>
                <Route exact path="/" element={<Navigate to={`/app/`} replace />} />
                <Route exact path="/login" element={<Navigate to={`/app/`} replace />} />
                <Route exact path="/login" element={<Navigate to={`/app/`} replace />} />
                <Route exact path="/app/" element={<Main />} />
                <Route exact path="/app/projetos" element={<Course />} />
                <Route exact path="/app/utilizadores" element={<User />} />
              </Route>
            </>
          ) : (
            <Route>
              <Route exact path="/login" element={<Login />} />
              <Route exact path="/gerar-password" element={<GeneratePassword />} />
              <Route exact path="/*" element={<Navigate to="/login" />} />
            </Route>
          )}
        </Routes>
      )}
    </ConfigProvider>
  );
}
