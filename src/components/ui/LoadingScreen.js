import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = ({ fullScreen = false }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '200px',
        width: '100%'
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
        Loading...
      </Typography>
    </Box>
  );
};

export default LoadingScreen;
