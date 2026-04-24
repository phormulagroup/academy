import { Navigate } from "react-router-dom";

import MainLayout from "../layout/main";
import Main from "../pages/app";
import Course from "../pages/app/course";
import CourseDetails from "../pages/app/course/details";
import Learning from "../pages/app/course/eLearning";
import Account from "../pages/app/account";
import Result from "../pages/app/results";
import Notifications from "../pages/app/notification";
import Inbox from "../pages/app/inbox";
import Document from "../pages/app/document";
import DocumentDetails from "../pages/app/document/details";
import Error404 from "../pages/app/404";
import Download from "../pages/app/download";
import DownloadDetails from "../pages/app/download/details";
import Faqs from "../pages/app/faqs";
import Contact from "../pages/app/contact";

export const userRoutes = [
  // Com layout principal
  {
    element: <MainLayout />,
    children: [
      { path: "login", element: <Navigate to="." replace /> }, // mantém :lang
      { index: true, element: <Main /> }, // "/:lang"
      { path: "account", element: <Account /> }, // "/:lang/courses"
      { path: "result", element: <Result /> }, // "/:lang/courses"
      { path: "courses", element: <Course /> }, // "/:lang/courses"
      { path: "documents", element: <Document /> }, // "/:lang/courses"
      { path: "documents/:slug", element: <DocumentDetails /> }, // "/:lang/courses"
      { path: "downloads", element: <Download /> }, // "/:lang/courses"
      { path: "downloads/:slug", element: <DownloadDetails /> }, // "/:lang/courses"
      { path: "faqs", element: <Faqs /> }, // "/:lang/faqs"
      { path: "notifications", element: <Notifications /> }, // "/:lang/notifications"
      { path: "inbox", element: <Inbox /> }, // "/:lang/inbox"
      { path: "contact", element: <Contact /> }, // "/:lang/contact"
      { path: "courses/:slug", element: <CourseDetails /> }, // "/:lang/courses/:slug"
      { path: "*", element: <Error404 /> }, // Errro 404 para rotas não encontradas dentro do layout, mantendo :lang
    ],
  },
  // Fora do MainLayout, mas ainda dentro de :lang
  { path: "courses/:slug/learning", element: <Learning /> }, // "/:lang/courses/:slug/learning"
];
