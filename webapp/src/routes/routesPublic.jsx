import { Navigate, Route, Routes, useRoutes } from "react-router-dom";

import MainLayout from "../layout/main";

import Login from "../pages/auth/login";
import GeneratePassword from "../pages/auth/generatePassword";
import Register from "../pages/auth/register";
import Main from "../pages/app";

export const publicRoutes = [
  {
    element: <MainLayout />,
    children: [{ index: true, element: <Main /> }],
  },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "gerar-password", element: <GeneratePassword /> },
  { path: "*", element: <Navigate to="." replace /> },
];
