import { createRoot } from "react-dom/client";
import AppRoutes from "./utils/routes.jsx";
import ContextProvider from "./utils/context.jsx";
import { BrowserRouter, Route, Router, RouterProvider, Routes } from "react-router-dom";
import router from "./utils/routes.jsx";
import { ConfigProvider } from "antd";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./utils/authConfig";

const msalInstance = new PublicClientApplication(msalConfig);

import "./index.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <MsalProvider instance={msalInstance}>
      <ContextProvider>
        <AppRoutes />
      </ContextProvider>
    </MsalProvider>
  </BrowserRouter>
);
