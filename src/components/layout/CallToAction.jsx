import React from 'react';
import { Box, Typography, Button, Container, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';

export default function CallToAction() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box component="section" sx={{ py: 10, textAlign: 'center', bgcolor: theme.palette.background.default }}>
      <Container maxWidth="md">
        <Typography variant="h3" sx={{ mb: 3, fontWeight: 700 }}>
          Ready to Measure Smarter?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 5 }}>
          Join Assessly today and start building the future of reliable, insightful assessments.
        </Typography>
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={() => navigate('/auth?tab=signup')}
          endIcon={<ArrowForward />}
          sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}
        >
          Start Your Free Trial
        </Button>
      </Container>
    </Box>
  );
}
