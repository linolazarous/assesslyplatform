// src/components/brand/Wordmark.jsx
import React from "react";
import PropTypes from "prop-types";
import { Typography, useTheme, Box } from "@mui/material";

/**
 * Wordmark component
 * Displays the brand name with configurable styling and optional tagline
 */
function Wordmark({ 
  variant = "h6", 
  color,
  fontWeight = 700,
  letterSpacing = 0.5,
  showTagline = false,
  tagline = "Assessment Platform",
  taglineVariant = "caption",
  taglineColor,
  align = "left",
  onClick,
  sx = {},
  animated = false,
}) {
  const theme = useTheme();

  const primaryColor = color || 
    (theme.palette.mode === "dark"
      ? theme.palette.primary.light
      : theme.palette.primary.main);

  const taglineColorFinal = taglineColor || theme.palette.text.secondary;

  const wordmarkStyles = {
    cursor: onClick ? "pointer" : "default",
    textAlign: align,
    transition: animated ? "all 0.3s ease" : "none",
    "&:hover": animated && onClick ? {
      transform: "translateY(-2px)",
      textShadow: `0 4px 8px ${theme.palette.mode === 'dark' 
        ? 'rgba(255,255,255,0.1)' 
        : 'rgba(0,0,0,0.1)'}`,
    } : {},
    ...sx,
  };

  return (
    <Box sx={wordmarkStyles} onClick={onClick}>
      <Typography
        variant={variant}
        sx={{
          fontWeight,
          letterSpacing,
          color: primaryColor,
          userSelect: "none",
          lineHeight: 1.2,
        }}
      >
        Assessly
      </Typography>
      
      {showTagline && (
        <Typography
          variant={taglineVariant}
          sx={{
            color: taglineColorFinal,
            mt: 0.5,
            letterSpacing: 0.2,
            fontWeight: 400,
            lineHeight: 1,
            opacity: 0.8,
          }}
        >
          {tagline}
        </Typography>
      )}
    </Box>
  );
}

Wordmark.propTypes = {
  variant: PropTypes.string,
  color: PropTypes.string,
  fontWeight: PropTypes.number,
  letterSpacing: PropTypes.number,
  showTagline: PropTypes.bool,
  tagline: PropTypes.string,
  taglineVariant: PropTypes.string,
  taglineColor: PropTypes.string,
  align: PropTypes.oneOf(["left", "center", "right"]),
  onClick: PropTypes.func,
  sx: PropTypes.object,
  animated: PropTypes.bool,
};

Wordmark.defaultProps = {
  variant: "h6",
  fontWeight: 700,
  letterSpacing: 0.5,
  showTagline: false,
  tagline: "Assessment Platform",
  taglineVariant: "caption",
  align: "left",
  animated: false,
};

export default React.memo(Wordmark);
