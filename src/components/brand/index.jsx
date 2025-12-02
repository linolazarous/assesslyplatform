// src/components/brand/index.jsx
// Centralized export for all brand assets with additional utilities

export { default as Logo } from "./Logo.jsx";
export { default as Wordmark } from "./Wordmark.jsx";
export { default as BrandMark } from "./BrandMark.jsx";
export { default as BrandColors } from "./BrandColors.jsx"; // Optional additional component

// Utility function to get brand colors
export const getBrandColors = (theme) => ({
  primary: theme.palette.primary.main,
  secondary: theme.palette.secondary.main,
  success: theme.palette.success.main,
  warning: theme.palette.warning.main,
  error: theme.palette.error.main,
  info: theme.palette.info.main,
  dark: theme.palette.grey[900],
  light: theme.palette.grey[100],
});

// Brand configuration object
export const brandConfig = {
  name: "Assessly",
  tagline: "Multitenant Assessment Platform",
  description: "Professional assessment and testing platform for organizations",
  url: "https://assesslyplatform-t49h.onrender.com",
  email: "support@assessly.com",
  social: {
    twitter: "https://twitter.com/assessly",
    linkedin: "https://linkedin.com/company/assessly",
    github: "https://github.com/assessly",
  },
  logoPaths: {
    dark: "/logo-dark.svg",
    light: "/logo-light.svg",
    monochrome: "/logo-monochrome.svg",
    favicon: "/favicon.ico",
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
      black: 900,
    },
  },
};
