import React from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';

// Layout components
import HeroSection from '../../components/layout/HeroSection.jsx';
import FeaturesSection from '../../components/layout/FeaturesSection.jsx';
import Testimonials from '../../components/layout/Testimonials.jsx';
import CallToAction from '../../components/layout/CallToAction.jsx';
import Footer from '../../components/common/Footer.jsx';

const LandingScreen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      component="main"
      id="top"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        overflowX: 'hidden',
      }}
    >
      {/* Main content container */}
      <Container
        maxWidth="xl"
        sx={{
          flex: 1, // Push footer to bottom
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 6 },
          display: 'flex',
          flexDirection: 'column',
          gap: 8, // vertical spacing between sections
        }}
      >
        <HeroSection />
        <FeaturesSection />
        <Testimonials />
        <CallToAction />
      </Container>

      {/* Footer outside main content for sticky-bottom behavior */}
      <Footer />
    </Box>
  );
};

export default LandingScreen;
