import { Navigate } from "react-router-dom";

import MainLayout from "../layout/main";
import Main from "../pages/app";
import Course from "../pages/app/course";
import CourseDetails from "../pages/app/course/details";
import Learning from "../pages/app/course/eLearning";
import Account from "../pages/app/account";
import Result from "../pages/app/results";

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
      { path: "courses/:slug", element: <CourseDetails /> }, // "/:lang/courses/:slug"
      // { path: "*", element: <Navigate to="." replace /> },  // opcional
    ],
  },

  // Fora do MainLayout, mas ainda dentro de :lang
  { path: "courses/:slug/learning", element: <Learning /> }, // "/:lang/courses/:slug/learning"
];
