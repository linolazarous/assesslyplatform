import { useState, useEffect, useCallback } from "react";

// Key used in localStorage
const STORAGE_KEY = "assessly-theme-mode";

export default function useThemeMode() {
  // Load initial mode from localStorage OR default to "light"
  const [mode, setMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "light";
    }
    return "light";
  });

  // Persist mode to localStorage whenever changed
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  // Toggle mode between light/dark
  const toggleColorMode = useCallback(() => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { mode, toggleColorMode };
}
