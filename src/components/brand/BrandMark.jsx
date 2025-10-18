// src/components/brand/BrandMark.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import { Logo, Wordmark } from "./index";

/**
 * BrandMark Component
 * Combines the brand logo and wordmark into a single responsive unit.
 *
 * Props:
 * - size: number → controls the logo image size (default 40)
 * - variant: string → typography variant for Wordmark (default 'h6')
 * - direction: 'row' | 'column' → layout orientation (default 'row')
 * - spacing: number → gap between logo and wordmark (default 1)
 * - color: string → override color for wordmark (optional)
 */
function BrandMark({ size = 40, variant = "h6", direction = "row", spacing = 1, color }) {
  return (
    <Box
      display="flex"
      alignItems="center"
      flexDirection={direction}
      justifyContent="center"
      gap={spacing}
      sx={{ userSelect: "none" }}
    >
      <Logo size={size} />
      <Wordmark variant={variant} color={color} />
    </Box>
  );
}

BrandMark.propTypes = {
  size: PropTypes.number,
  variant: PropTypes.string,
  direction: PropTypes.oneOf(["row", "column"]),
  spacing: PropTypes.number,
  color: PropTypes.string,
};

export default React.memo(BrandMark);
