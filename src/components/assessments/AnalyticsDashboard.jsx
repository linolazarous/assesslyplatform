import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const AnalyticsDashboard = ({ data }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography color="text.secondary">
        Analytics feature coming soon...
      </Typography>
    </Paper>
  );
};

export default AnalyticsDashboard;
