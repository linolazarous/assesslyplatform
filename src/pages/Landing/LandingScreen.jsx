// src/pages/Landing/LandingScreen.jsx
import React from 'react';
import { 
  Box,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
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
      className="app-container landing-page" // ✅ Added layout classes
      component="div"
      id="top"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
        width: '100%', // ✅ Ensure full width
      }}
    >
      {/* Main Content */}
      <Container
        maxWidth="xl"
        className="main-content" // ✅ Added layout class
        sx={{
          flex: 1,
          px: isMobile ? 2 : 4,
          py: isMobile ? 3 : 6,
          width: '100%', // ✅ Ensure full width
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Hero Section with Video Background */}
        <Box className="section-container" sx={{ width: '100%' }}> {/* ✅ Added wrapper */}
          <HeroSection videoUrl="/Assessly.mp4" />
        </Box>

        {/* Core Platform Features */}
        <Box className="section-container" sx={{ width: '100%', py: 4 }}> {/* ✅ Added wrapper */}
          <FeaturesSection />
        </Box>

        {/* Testimonials */}
        <Box className="section-container" sx={{ width: '100%', py: 4 }}> {/* ✅ Added wrapper */}
          <Testimonials />
        </Box>

        {/* Call to Action */}
        <Box className="section-container" sx={{ width: '100%', py: 4 }}> {/* ✅ Added wrapper */}
          <CallToAction />
        </Box>
      </Container>

      {/* Footer */}
      <Footer />

      {/* Scroll-to-Top Button */}
      <Box
        component="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: 'primary.main',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 50,
          height: 50,
          cursor: 'pointer',
          boxShadow: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': { bgcolor: 'primary.dark' },
          zIndex: 999,
        }}
        aria-label="Scroll to top"
      >
        ↑
      </Box>
    </Box>
  );
};

export default LandingScreen;
