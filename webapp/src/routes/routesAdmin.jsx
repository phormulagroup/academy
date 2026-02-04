import { Navigate } from "react-router-dom";

import MainAdmin from "../pages/admin";
import AdminLayout from "../layout/admin";
import User from "../pages/admin/user";
import Language from "../pages/admin/language";
import Media from "../pages/admin/media";

import Course from "../pages/admin/course";
import CourseDetails from "../pages/admin/course/details";

import Topic from "../pages/admin/course/topic";

export const adminRoutes = [
  {
    element: <AdminLayout />,
    children: [
      { path: "/login", element: <Navigate to="/" replace /> },
      { path: "/admin/", element: <MainAdmin /> },
      { path: "/admin/courses", element: <Course /> },
      { path: "/admin/course/:id", element: <CourseDetails /> },
      { path: "/admin/languages", element: <Language /> },
      { path: "/admin/users", element: <User /> },
      { path: "/admin/media", element: <Media /> },
    ],
  },
  {
    path: "/admin/course/:id/topic/:idTopic",
    element: <Topic />,
  },
];
