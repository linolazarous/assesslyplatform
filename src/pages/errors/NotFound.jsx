// src/pages/errors/NotFound.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper 
} from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFound = () => {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            maxWidth: 500,
            mx: 'auto',
          }}
        >
          <Typography
            variant="h1"
            component="h1"
            color="error"
            sx={{
              fontSize: '6rem',
              fontWeight: 700,
              mb: 2,
            }}
          >
            404
          </Typography>
          
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            Page Not Found
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            The page you're looking for doesn't exist or has been moved.
          </Typography>
          
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            color="primary"
            size="large"
            startIcon={<HomeIcon />}
            sx={{ 
              px: 4,
              py: 1.5,
              fontWeight: 600,
            }}
          >
            Go Back Home
          </Button>
          
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Need help?{' '}
              <Button 
                component={RouterLink} 
                to="/contact" 
                color="primary"
                size="small"
                sx={{ textTransform: 'none' }}
              >
                Contact Support
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;
