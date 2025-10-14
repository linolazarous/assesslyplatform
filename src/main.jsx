import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";
import "./styles/theme.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

// Mount point
const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

// Render the app
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
