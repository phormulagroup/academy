import { createRoot } from "react-dom/client";
import AppRoutes from "./routes";
import ContextProvider from "./utils/context.jsx";
import { BrowserRouter, Route, Router, RouterProvider, Routes } from "react-router-dom";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ContextProvider>
      <AppRoutes />
    </ContextProvider>
  </BrowserRouter>,
);
