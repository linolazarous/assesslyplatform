// src/components/brand/Logo.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box, useTheme } from "@mui/material";

/**
 * Logo Component
 * Responsive brand logo with fallback and theme support
 * Supports multiple logo variations (dark/light mode)
 */
function Logo({ 
  size = 40, 
  variant = "default", // 'default', 'dark', 'light', 'monochrome'
  shape = "rounded", // 'rounded', 'square', 'circle'
  onClick,
  sx = {},
  showBadge = false,
  badgeText = "Pro",
  badgeColor = "primary",
}) {
  const theme = useTheme();
  
  // Determine which logo to use based on variant and theme
  const getLogoPath = () => {
    const baseUrl = import.meta.env.VITE_PUBLIC_URL || import.meta.env.BASE_URL || "/";
    
    if (variant === "dark") {
      return `${baseUrl}logo-dark.svg`;
    } else if (variant === "light") {
      return `${baseUrl}logo-light.svg`;
    } else if (variant === "monochrome") {
      return `${baseUrl}logo-monochrome.svg`;
    } else {
      // Default - use theme aware logo
      return theme.palette.mode === "dark" 
        ? `${baseUrl}logo-light.svg`
        : `${baseUrl}logo-dark.svg`;
    }
  };

  const logoPath = getLogoPath();
  
  const shapeStyles = {
    rounded: { borderRadius: 2 },
    square: { borderRadius: 0 },
    circle: { borderRadius: "50%" },
  };

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-block",
        cursor: onClick ? "pointer" : "default",
        ...sx,
      }}
      onClick={onClick}
    >
      <Box
        component="img"
        src={logoPath}
        alt="Assessly Platform Logo"
        width={size}
        height={size}
        loading="lazy"
        onError={(e) => {
          // Fallback to text if image fails to load
          e.target.style.display = "none";
          e.target.parentElement.innerHTML = `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: ${theme.palette.primary.main};
              color: white;
              border-radius: ${shape === 'circle' ? '50%' : '8px'};
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: ${size * 0.4}px;
            ">A</div>
          `;
        }}
        sx={{
          ...shapeStyles[shape],
          objectFit: "contain",
          display: "block",
          userSelect: "none",
          transition: "transform 0.3s ease",
          "&:hover": onClick ? {
            transform: "scale(1.05)",
          } : {},
        }}
      />
      
      {showBadge && (
        <Box
          sx={{
            position: "absolute",
            top: -6,
            right: -6,
            bgcolor: `${badgeColor}.main`,
            color: `${badgeColor}.contrastText`,
            fontSize: Math.max(10, size * 0.15),
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: 12,
            minWidth: 20,
            textAlign: "center",
            border: `2px solid ${theme.palette.background.paper}`,
            boxShadow: 1,
          }}
        >
          {badgeText}
        </Box>
      )}
    </Box>
  );
}

Logo.propTypes = {
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  variant: PropTypes.oneOf(["default", "dark", "light", "monochrome"]),
  shape: PropTypes.oneOf(["rounded", "square", "circle"]),
  onClick: PropTypes.func,
  sx: PropTypes.object,
  showBadge: PropTypes.bool,
  badgeText: PropTypes.string,
  badgeColor: PropTypes.string,
};

Logo.defaultProps = {
  size: 40,
  variant: "default",
  shape: "rounded",
  showBadge: false,
  badgeColor: "primary",
};

export default React.memo(Logo);
