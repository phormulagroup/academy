import { createRoot } from "react-dom/client";
import AppRoutes from "./routes";
import ContextProvider from "./utils/context.jsx";
import ErrorBoundary from "./components/fallback/errorBoundary";
import ServerDownGate from "./components/fallback/serverDownGate";
import { BrowserRouter } from "react-router-dom";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ServerDownGate>
      <BrowserRouter>
        <ContextProvider>
          <AppRoutes />
        </ContextProvider>
      </BrowserRouter>
    </ServerDownGate>
  </ErrorBoundary>,
);
