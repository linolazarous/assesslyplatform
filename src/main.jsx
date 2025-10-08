// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Create root container
const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

// Mount React application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Enable hot reload (Vite or CRA dev)
if (import.meta.hot) {
  import.meta.hot.accept();
}
