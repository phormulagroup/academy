import { lazyPage } from "../components/lazyPage";
import { Navigate, Route, Routes, useRoutes } from "react-router-dom";

import MainLayout from "../layout/main";

const Login = lazyPage(() => import("../pages/auth/login"));
const Register = lazyPage(() => import("../pages/auth/register"));
const Main = lazyPage(() => import("../pages/app"));
const Error404 = lazyPage(() => import("../pages/app/404"));
const Recover = lazyPage(() => import("../pages/auth/recover"));
const Faqs = lazyPage(() => import("../pages/app/faqs"));
const Contact = lazyPage(() => import("../pages/app/contact"));

export const publicRoutes = [
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <Main /> },
      { path: "about", element: <Navigate to="/" replace /> },
      { path: "faqs", element: <Faqs /> },
      { path: "contact", element: <Contact /> },
      { path: "*", element: <Error404 /> },
    ],
  },
  { path: "login", element: <Login /> },
  { path: "recover", element: <Recover /> },
  { path: "register", element: <Register /> },
  { path: "*", element: <Error404 /> },
];
