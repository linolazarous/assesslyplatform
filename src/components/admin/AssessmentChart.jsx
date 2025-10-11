import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import PropTypes from 'prop-types';

// NOTE: In a real app, this would use a library like recharts or chart.js
export default function AssessmentChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No recent assessment data available for charting.
      </Alert>
    );
  }

  // Mock data display
  const totalAssessments = data.length;
  const lastAssessment = data[0]?.title || 'N/A';

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Assessment Trends (Mock Chart)
      </Typography>
      <Box sx={{ height: 300, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          [Placeholder for Chart Visualization]
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Showing data for **{totalAssessments}** recent assessments.
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Latest entry: {lastAssessment}
      </Typography>
    </Box>
  );
}

AssessmentChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
};

