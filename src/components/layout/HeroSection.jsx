import React from 'react';
import { Box, Typography, Button, Grid, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../brand';
import PropTypes from 'prop-types';

const HeroSection = ({ videoUrl = '/Assessly.mp4' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: { xs: '70vh', md: '80vh' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: theme.palette.background.default,
      }}
    >
      {/* Video Background */}
      <Box
        component="video"
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />

      {/* Dark overlay for better text readability */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 2, width: '100%', py: 8 }}>
        <Grid container spacing={4} alignItems="center" sx={{ px: { xs: 2, md: 4 } }}>
          {/* Text Content */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              {/* Logo for mobile */}
              {isMobile && (
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                  <Logo size={60} />
                </Box>
              )}

              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  mb: 3,
                  fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                  lineHeight: 1.1,
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                Measure Smarter, Not Harder
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  maxWidth: 500,
                  mx: { xs: 'auto', md: 0 },
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                From Questions to Insights, Anywhere — A modern assessment SaaS platform.
              </Typography>

              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: { xs: 'center', md: 'flex-start' },
                  flexWrap: 'wrap' 
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/auth?tab=signup')}
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => {
                    const featuresSection = document.getElementById('features-section');
                    if (featuresSection) {
                      featuresSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  See Features
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Video Preview for desktop */}
          {!isMobile && (
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
                    borderRadius: 2,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    border: `2px solid ${theme.palette.primary.main}`,
                  }}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

HeroSection.propTypes = { 
  videoUrl: PropTypes.string 
};

HeroSection.defaultProps = {
  videoUrl: '/Assessly.mp4'
};

export default React.memo(HeroSection);
