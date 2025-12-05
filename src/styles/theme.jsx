// src/styles/theme.jsx
import { createTheme } from "@mui/material/styles";

// Design system
const primaryColor = "#2D6CDF";
const darkBg = "#121212";

export const getAppTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
      },
      background: {
        default: mode === "dark" ? darkBg : "#ffffff",
        paper: mode === "dark" ? "#1E1E1E" : "#f6f9fc",
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      button: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
    },
  });
