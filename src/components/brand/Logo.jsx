import React from "react";
import PropTypes from "prop-types";

/**
 * Logo Component
 * - Dynamically loads the project logo using Vite’s BASE_URL
 * - Adjustable size via prop
 * - Memoized for performance
 */
function Logo({ size = 40 }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Assessly Logo"
      width={size}
      height={size}
      loading="lazy"
      style={{
        borderRadius: 8,
        objectFit: "contain",
        display: "block",
        userSelect: "none",
      }}
    />
  );
}

Logo.propTypes = {
  size: PropTypes.number,
};

export default React.memo(Logo);
