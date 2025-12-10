import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const CandidateList = ({ assessmentId }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Candidate List
      </Typography>
      <Typography color="text.secondary">
        Candidate list feature coming soon...
      </Typography>
    </Paper>
  );
};

export default CandidateList;
