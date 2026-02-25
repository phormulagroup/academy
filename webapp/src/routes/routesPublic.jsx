import { Navigate, Route, Routes, useRoutes } from "react-router-dom";

import MainLayout from "../layout/main";

import Login from "../pages/auth/login";
import GeneratePassword from "../pages/auth/generatePassword";
import Register from "../pages/auth/register";
import Main from "../pages/app";
import Error404 from "../pages/app/404";

export const publicRoutes = [
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <Main /> },
      { path: "*", element: <Error404 /> },
    ],
  },
  { path: "login", element: <Login /> },
  { path: "register", element: <Register /> },
  { path: "gerar-password", element: <GeneratePassword /> },
];
