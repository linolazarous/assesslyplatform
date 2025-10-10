import React from 'react';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';

export const Logo = ({ size = 40, withText = true, darkMode = false, sx }) => {
  // Determine colors based on dark mode status
  const logoFillColor = darkMode ? "#ffffff" : "url(#gradient)";
  const checkmarkStrokeColor = darkMode ? "#3f51b5" : "#ffffff";
  const textColor = darkMode 
    ? 'linear-gradient(45deg, #ffffff 30%, #c3cfe2 90%)'
    : 'linear-gradient(45deg, #3f51b5 30%, #4caf50 90%)';

  return (
    // Apply sx prop directly to the container Box for external styling
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...sx }}>
      {/* SVG Logo */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shield Base */}
        <path 
          d="M50 5L10 25V60C10 80 50 95 50 95S90 80 90 60V25L50 5Z" 
          fill={logoFillColor} 
        />
        {/* Checkmark */}
        <path 
          d="M30 50L45 65L70 35" 
          stroke={checkmarkStrokeColor} 
          strokeWidth="8" 
          strokeLinecap="round"
        />
        {/* Gradient Definition - Only needed once */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3f51b5" />
            <stop offset="100%" stopColor="#4caf50" />
          </linearGradient>
        </defs>
      </svg>

      {withText && (
        <Box 
          component="span"
          sx={{ 
            fontWeight: 700,
            fontSize: size * 0.5,
            background: textColor,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Assessly
        </Box>
      )}
    </Box>
  );
};

Logo.propTypes = {
  // size can be a number or a string (e.g., '100%') for responsiveness
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), 
  withText: PropTypes.bool,
  darkMode: PropTypes.bool,
  // PropTypes for the MUI sx prop
  sx: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.bool])),
    PropTypes.func,
    PropTypes.object,
  ]),
};
