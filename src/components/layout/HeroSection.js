import React from 'react';
import { 
  Box,
  Typography,
  Button,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Logo from '../../brand/logo';  // ← FIXED IMPORT PATH

const HeroSection = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      textAlign: 'center',
      py: 10,
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(180deg, #121212 0%, #1E1E1E 100%)'
        : 'linear-gradient(180deg, #f5f7fa 0%, #e4e8f0 100%)',
      borderRadius: 4,
      mb: 8,
      px: 4
    }}>
      <Logo size={120} sx={{ mb: 4 }} />
      
      <Typography 
        variant="h2" 
        sx={{ 
          fontWeight: 800,
          mb: 3,
          [theme.breakpoints.down('sm')]: {
            fontSize: '2rem'
          }
        }}
      >
        Measure Smarter, Not Harder
      </Typography>
      
      <Typography 
        variant="h5" 
        sx={{ 
          mb: 5,
          color: 'text.secondary',
          maxWidth: 800,
          mx: 'auto',
          [theme.breakpoints.down('sm')]: {
            fontSize: '1.1rem'
          }
        }}
      >
        From Questions to Insights, Anywhere - The Complete Assessment Platform
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          size="large"
          onClick={() => navigate('/signup')}
          sx={{ px: 5 }}
        >
          Get Started
        </Button>
        <Button 
          variant="outlined" 
          size="large"
          onClick={() => navigate('/demo')}
          sx={{ px: 5 }}
        >
          Live Demo
        </Button>
      </Box>
    </Box>
  );
};

export default HeroSection;
