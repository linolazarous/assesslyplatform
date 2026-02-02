// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ""}
      // Optional: script loading options (recommended for better performance)
      scriptProps={{
        async: true,
        defer: true,
        appendTo: "head",
      }}
      // Optional: use recaptcha.net domain (fallback if google.com is blocked in some regions)
      // useRecaptchaNet={true}
    >
      <App />
    </GoogleReCaptchaProvider>
  </React.StrictMode>
);
