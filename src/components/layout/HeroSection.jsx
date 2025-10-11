import React from 'react';
import { 
  Box,
  Typography,
  Button,
  useTheme,
  Grid,
  useMediaQuery
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../brand'; 
import PropTypes from 'prop-types';

const HeroSection = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Video URL is relative to the root public folder
  const videoUrl = 'assesslyplatform/assessly.webp'; 

  return (
    <Box 
      component="section"
      sx={{ 
        py: { xs: 8, md: 12 }, 
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, #121212 0%, #1E1E1E 100%)'
          : 'linear-gradient(180deg, #f5f7fa 0%, #e4e8f0 100%)',
        borderRadius: 4,
        mb: 8,
        px: 4,
        overflow: 'hidden'
      }}
    >
      <Grid container spacing={4} alignItems="center">
        {/* Text and CTA Column */}
        <Grid item xs={12} md={6} sx={{ textAlign: isMobile ? 'center' : 'left' }}>
          <Box sx={{ display: isMobile ? 'block' : 'none', mb: 3 }}>
             <Logo size={80} />
          </Box>
          <Typography 
            variant="h2" 
            component="h1"
            sx={{ 
              fontWeight: 800,
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              lineHeight: 1.1
            }}
          >
            Measure Smarter, Not Harder
          </Typography>
          
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 4,
              color: 'text.secondary',
              maxWidth: 600,
              mx: isMobile ? 'auto' : 0,
              fontSize: { xs: '1.2rem', md: '1.5rem' }
            }}
          >
            From Questions to Insights, Anywhere — A modern assessment SaaS platform.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: isMobile ? 'center' : 'flex-start' }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate('/auth?tab=signup')}
              sx={{ px: 5 }}
            >
              Get Started Free
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => document.getElementById('features-section').scrollIntoView({ behavior: 'smooth' })}
              sx={{ px: 5 }}
            >
              See Features
            </Button>
          </Box>
        </Grid>

        {/* Video Advertisement Column */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box 
              component="video"
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              sx={{
                width: '100%',
                maxWidth: 500,
                borderRadius: 3,
                boxShadow: theme.shadows[10],
                border: `4px solid ${theme.palette.primary.main}`
              }}
            >
              Your browser does not support the video tag.
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HeroSection;
