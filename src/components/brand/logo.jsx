import React from "react";
import PropTypes from "prop-types";

function Logo({ size = 40 }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Assessly Logo"
      width={size}
      height={size}
      style={{ borderRadius: 8 }}
    />
  );
}

Logo.propTypes = { size: PropTypes.number };

export default React.memo(Logo);
