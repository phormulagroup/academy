import { Navigate } from "react-router-dom";

import MainAdmin from "../pages/admin";
import AdminLayout from "../layout/admin";
import User from "../pages/admin/user";
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

export const adminRoutes = [
  {
    element: <AdminLayout />,
    children: [
      { path: "/admin/", element: <MainAdmin /> },
      { path: "/admin/courses", element: <Course /> },
      { path: "/admin/courses/:id", element: <CourseDetails /> },
      { path: "/admin/courses/:id/test/:idTest", element: <Test /> },
      { path: "/admin/languages", element: <Language /> },
      { path: "/admin/smtp", element: <SMTP /> },
      { path: "/admin/templates", element: <Template /> },
      { path: "/admin/templates/:id", element: <TemplateDetails /> },
      { path: "/admin/users", element: <User /> },
      { path: "/admin/media", element: <Media /> },
      { path: "/admin/certificate", element: <Certificate /> },
      { path: "/admin/certificate/:id", element: <CertificateDetails /> },
      { path: "/admin/*", element: <Navigate to="/admin" replace /> },
    ],
  },
  {
    path: "/admin/courses/:id/topic/:idTopic",
    element: <Topic />,
  },
];
