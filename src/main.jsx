import React, { Suspense, StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import "./index.css";

const LoadingFallback = () => (
  <div style={{ textAlign: "center", padding: "20px" }}>
    <p>Loading Assessly...</p>
  </div>
);

function safeRegisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    fetch("/sw.js", { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          navigator.serviceWorker.register("/sw.js").catch(() => {});
        }
      })
      .catch(() => {});
  }
}

safeRegisterServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
);
