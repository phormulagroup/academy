import { Navigate, Route, Routes, useRoutes } from "react-router-dom";
import Login from "../pages/auth/login";
import GeneratePassword from "../pages/auth/generatePassword";
import Register from "../pages/auth/register";

export const publicRoutes = [
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/gerar-password", element: <GeneratePassword /> },
  { path: "/*", element: <Navigate to="/login" replace /> },
];
