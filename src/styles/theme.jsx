// src/styles/theme.jsx
import { createTheme } from "@mui/material/styles";
import { alpha } from "@mui/material";

// Design system
const primaryColor = "#2D6CDF";
const secondaryColor = "#9C27B0";
const errorColor = "#f44336";
const successColor = "#4CAF50";
const darkBg = "#121212";
const lightBg = "#f6f9fc";

/**
 * getAppTheme - Returns a MUI theme with trending modern features
 * @param {string} mode - "light" | "dark"
 * @returns {Theme}
 */
export const getAppTheme = (mode = "light") =>
  createTheme({
    palette: {
      mode,
      primary: { main: primaryColor },
      secondary: { main: secondaryColor },
      error: { main: errorColor },
      success: { main: successColor },
      background: {
        default: mode === "dark" ? darkBg : lightBg,
        paper: mode === "dark" ? "#1E1E1E" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#ffffff" : "#111827",
        secondary: mode === "dark" ? "#cfd8dc" : "#4B5563",
      },
    },

    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 800, letterSpacing: "-0.5px" },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 500 },
      h6: { fontWeight: 500 },
      body1: { fontSize: "1rem", lineHeight: 1.6 },
      body2: { fontSize: "0.875rem", lineHeight: 1.5 },
      button: { textTransform: "none", fontWeight: 600 },
    },

    shape: { borderRadius: 12 },

    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 6px 12px ${alpha(primaryColor, 0.2)}`,
            },
            "&:focus": {
              outline: `2px solid ${alpha(primaryColor, 0.5)}`,
              outlineOffset: 2,
            },
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            padding: "1rem",
            background: mode === "dark"
              ? alpha("#ffffff", 0.05)
              : "#ffffff",
            boxShadow: mode === "dark"
              ? "0 8px 20px rgba(0,0,0,0.3)"
              : "0 4px 12px rgba(0,0,0,0.08)",
            backdropFilter: "blur(8px)", // glassmorphism effect
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            transition: "all 0.3s ease",
          },
        },
      },

      MuiSnackbar: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: "0.5rem 1rem",
            backdropFilter: "blur(6px)",
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: "saturate(180%) blur(10px)",
            backgroundColor: mode === "dark"
              ? alpha("#000", 0.72)
              : alpha("#ffffff", 0.72),
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: "0.8rem",
            borderRadius: 6,
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: "all 0.2s ease",
            "&:hover": { transform: "scale(1.1)" },
          },
        },
      },
    },

    // Motion & transitions
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
  });

export default getAppTheme;
