import { Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Context } from "./context";
import { useContext } from "react";

import Loading from "../layout/loading";
import Login from "../pages/auth/login";
import Main from "../pages/main/main";
import MainLayout from "../layout/index";
import Course from "../pages/main/course";
import User from "../pages/main/user";
import GeneratePassword from "../pages/auth/generatePassword";
import Language from "../pages/main/language";

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
                <Route exact path="/" element={<Navigate to={`/admin/`} replace />} />
                <Route exact path="/login" element={<Navigate to={`/admin/`} replace />} />
                <Route exact path="/login" element={<Navigate to={`/admin/`} replace />} />
                <Route exact path="/admin/" element={<Main />} />
                <Route exact path="/admin/courses" element={<Course />} />
                <Route exact path="/admin/languages" element={<Language />} />
                <Route exact path="/admin/users" element={<User />} />
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
