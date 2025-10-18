// src/components/brand/Wordmark.jsx
import React from "react";
import PropTypes from "prop-types";
import { Typography, useTheme } from "@mui/material";

/**
 * Wordmark component
 * Displays the brand name "Assessly" using theme-aware styling.
 */
function Wordmark({ variant = "h6", color }) {
  const theme = useTheme();

  return (
    <Typography
      variant={variant}
      sx={{
        fontWeight: 700,
        letterSpacing: 0.5,
        color:
          color ||
          (theme.palette.mode === "dark"
            ? theme.palette.primary.light
            : theme.palette.primary.main),
        userSelect: "none",
      }}
    >
      Assessly
    </Typography>
  );
}

Wordmark.propTypes = {
  variant: PropTypes.string,
  color: PropTypes.string,
};

export default React.memo(Wordmark);
