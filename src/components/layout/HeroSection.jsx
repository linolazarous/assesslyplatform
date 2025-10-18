import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  Grid,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../brand';
import PropTypes from 'prop-types';

const HeroSection = ({ videoUrl = '/Assessly.mp4' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        position: 'relative',
        borderRadius: 4,
        mb: 8,
        px: 4,
        overflow: 'hidden',
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

      {/* Gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <Grid container spacing={4} alignItems="center" sx={{ position: 'relative', zIndex: 2 }}>
        {/* Left: Text */}
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
              lineHeight: 1.1,
              color: '#fff',
            }}
          >
            Measure Smarter, Not Harder
          </Typography>

          <Typography
            variant="h5"
            sx={{
              mb: 4,
              maxWidth: 600,
              mx: isMobile ? 'auto' : 0,
              fontSize: { xs: '1.2rem', md: '1.5rem' },
              color: '#f0f0f0',
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
              onClick={() =>
                document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })
              }
              sx={{ px: 5, color: '#fff', borderColor: '#fff', '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              See Features
            </Button>
          </Box>
        </Grid>

        {/* Right: Optional video placeholder for desktop */}
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
                  borderRadius: 3,
                  boxShadow: theme.shadows[10],
                  border: `4px solid ${theme.palette.primary.main}`,
                }}
              >
                Your browser does not support the video tag.
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

HeroSection.propTypes = {
  videoUrl: PropTypes.string,
};

export default React.memo(HeroSection);
