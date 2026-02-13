import { Navigate } from "react-router-dom";

import MainLayout from "../layout/main";

import Main from "../pages/app";
import Course from "../pages/app/course";
import CourseDetails from "../pages/app/course/details";
import Learning from "../pages/app/course/eLearning";

export const userRoutes = [
  {
    element: <MainLayout />,
    children: [
      { path: "/login", element: <Navigate to="/" replace /> },
      { path: "/", element: <Main /> },
      { path: "/courses", element: <Course /> },
      { path: "/course/:slug", element: <CourseDetails /> },
    ],
  },
  { path: "/course/:slug/learning", element: <Learning /> },
];
