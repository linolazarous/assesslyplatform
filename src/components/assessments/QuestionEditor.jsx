import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const QuestionEditor = ({ assessmentId, questions, readOnly }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Question Editor
      </Typography>
      <Typography color="text.secondary">
        Question editor feature coming soon...
      </Typography>
    </Paper>
  );
};

export default QuestionEditor;
