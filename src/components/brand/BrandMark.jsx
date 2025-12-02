// src/components/brand/BrandMark.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box, useTheme, alpha } from "@mui/material";

/**
 * BrandMark Component
 * Combines logo and wordmark with advanced layout options
 */
import { Logo, Wordmark } from "./index";

function BrandMark({ 
  size = 40, 
  variant = "h6", 
  direction = "row", 
  spacing = 1.5, 
  color,
  logoVariant = "default",
  logoShape = "rounded",
  showTagline = false,
  tagline = "Assessment Platform",
  align = "left",
  responsive = true,
  onClick,
  sx = {},
  animated = false,
  withBackground = false,
  backgroundOpacity = 0.08,
}) {
  const theme = useTheme();

  const isRow = direction === "row";
  const isColumn = direction === "column";

  const responsiveStyles = responsive ? {
    [theme.breakpoints.down("sm")]: {
      gap: spacing * 0.75,
      "& .logo-container": {
        width: size * 0.8,
        height: size * 0.8,
      },
      "& .wordmark": {
        fontSize: "0.9em",
      },
    },
  } : {};

  const backgroundStyles = withBackground ? {
    backgroundColor: alpha(theme.palette.primary.main, backgroundOpacity),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 2,
    transition: "background-color 0.3s ease",
    "&:hover": withBackground && animated ? {
      backgroundColor: alpha(theme.palette.primary.main, backgroundOpacity + 0.05),
    } : {},
  } : {};

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: isRow ? "center" : "flex-start",
        flexDirection: direction,
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        gap: theme.spacing(spacing),
        userSelect: "none",
        cursor: onClick ? "pointer" : "default",
        transition: animated ? "all 0.3s ease" : "none",
        ...responsiveStyles,
        ...backgroundStyles,
        ...sx,
      }}
      onClick={onClick}
      className="brand-mark"
    >
      <Box className="logo-container">
        <Logo 
          size={size} 
          variant={logoVariant}
          shape={logoShape}
          sx={animated ? {
            transition: "transform 0.3s ease",
            "&:hover": {
              transform: "rotate(5deg)",
            },
          } : {}}
        />
      </Box>
      
      <Box 
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: isColumn ? "center" : align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        }}
        className="wordmark-container"
      >
        <Wordmark
          variant={variant}
          color={color}
          align={isColumn ? "center" : align}
          showTagline={showTagline}
          tagline={tagline}
          sx={animated ? {
            transition: "all 0.3s ease",
            "&:hover": {
              letterSpacing: "0.6px",
            },
          } : {}}
        />
      </Box>
    </Box>
  );
}

BrandMark.propTypes = {
  size: PropTypes.number,
  variant: PropTypes.string,
  direction: PropTypes.oneOf(["row", "column"]),
  spacing: PropTypes.number,
  color: PropTypes.string,
  logoVariant: PropTypes.oneOf(["default", "dark", "light", "monochrome"]),
  logoShape: PropTypes.oneOf(["rounded", "square", "circle"]),
  showTagline: PropTypes.bool,
  tagline: PropTypes.string,
  align: PropTypes.oneOf(["left", "center", "right"]),
  responsive: PropTypes.bool,
  onClick: PropTypes.func,
  sx: PropTypes.object,
  animated: PropTypes.bool,
  withBackground: PropTypes.bool,
  backgroundOpacity: PropTypes.number,
};

BrandMark.defaultProps = {
  size: 40,
  variant: "h6",
  direction: "row",
  spacing: 1.5,
  logoVariant: "default",
  logoShape: "rounded",
  showTagline: false,
  tagline: "Assessment Platform",
  align: "left",
  responsive: true,
  animated: false,
  withBackground: false,
  backgroundOpacity: 0.08,
};

export default React.memo(BrandMark);
