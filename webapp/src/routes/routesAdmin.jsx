import { Navigate } from "react-router-dom";

import MainAdmin from "../pages/admin/index";
import AdminLayout from "../layout/admin";
import User from "../pages/admin/user/index";
import Language from "../pages/admin/language";
import Media from "../pages/admin/media";

import Course from "../pages/admin/course";
import CourseDetails from "../pages/admin/course/details";

import Topic from "../pages/admin/course/topic";
import Test from "../pages/admin/course/test";
import SMTP from "../pages/admin/email/smtp";
import Template from "../pages/admin/email/template";
import TemplateDetails from "../pages/admin/email/templateDetails";
import Certificate from "../pages/admin/certificate";
import CertificateDetails from "../pages/admin/certificate/details";
import UserDetails from "../pages/admin/user/details";
import Notification from "../pages/admin/notification";
import Document from "../pages/admin/document";
import Inbox from "../pages/admin/inbox";
import Report from "../pages/admin/report";
import Download from "../pages/admin/download";

export const adminRoutes = [
  {
    path: "/admin/",
    element: <AdminLayout />,
    children: [
      { index: true, element: <MainAdmin /> },
      { path: "courses", element: <Course /> },
      { path: "courses/:id", element: <CourseDetails /> },
      { path: "courses/:id/test/:idTest", element: <Test /> },
      { path: "reports", element: <Report /> },
      { path: "languages", element: <Language /> },
      { path: "smtp", element: <SMTP /> },
      { path: "templates", element: <Template /> },
      { path: "templates/:id", element: <TemplateDetails /> },
      { path: "users", element: <User /> },
      { path: "users/:id", element: <UserDetails /> },
      { path: "documents", element: <Document /> },
      { path: "downloads", element: <Download /> },
      { path: "media", element: <Media /> },
      { path: "certificate", element: <Certificate /> },
      { path: "certificate/:id", element: <CertificateDetails /> },
      { path: "notification", element: <Notification /> },
      { path: "inbox", element: <Inbox /> },
      { path: "*", element: <Navigate to="/admin/" replace /> },
    ],
  },
  {
    path: "/admin/courses/:id/topic/:idTopic",
    element: <Topic />,
  },
];
