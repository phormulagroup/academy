import { createRoot } from "react-dom/client";
import AppRoutes from "./utils/routes.jsx";
import ContextProvider from "./utils/context.jsx";
import { BrowserRouter, Route, Router, RouterProvider, Routes } from "react-router-dom";
import router from "./utils/routes.jsx";
import { ConfigProvider } from "antd";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ContextProvider>
      <AppRoutes />
    </ContextProvider>
  </BrowserRouter>,
);
