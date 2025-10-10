import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import PropTypes from 'prop-types'; // Import PropTypes

const LoadingScreen = ({ fullScreen = false }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // If fullScreen is true, use 100vh; otherwise, use a minimum height of 200px.
        minHeight: fullScreen ? '100vh' : '200px',
        width: '100%',
        // Ensure the component is layered correctly if used as a full screen overlay
        // and zIndex is useful if this sits on top of other content.
        zIndex: fullScreen ? 9999 : 'auto', 
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Loading...
      </Typography>
    </Box>
  );
};

LoadingScreen.propTypes = {
  // fullScreen is an optional boolean with a default value of false
  fullScreen: PropTypes.bool,
};

export default LoadingScreen;
