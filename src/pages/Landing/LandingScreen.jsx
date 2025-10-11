import React from 'react';
import { 
  Box,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import PropTypes from 'prop-types'; 

// FIX: Corrected relative paths to access components/layout/ from pages/Landing/
import HeroSection from '../../components/layout/HeroSection.jsx';
import FeaturesSection from '../../components/layout/FeaturesSection.jsx';
import Testimonials from '../../components/layout/Testimonials.jsx';
import CallToAction from '../../components/layout/CallToAction.jsx';
// Correct path for common components
import Footer from '../../components/common/Footer.jsx'; 

const LandingScreen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Ensure scroll-smooth behavior is enabled globally (usually in global.css or theme)
  // For robustness, we will set a top ID for the "Back to Top" functionality.
  
  return (
    <Box 
      component="div"
      id="top" // Anchor for scroll-to-top feature
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        overflowX: 'hidden' 
      }}
    >
      {/* Main Content Area */}
      <Container 
        maxWidth="xl" 
        sx={{ 
          flex: 1, // Ensures content area pushes the footer to the bottom
          px: isMobile ? 2 : 4,
          py: isMobile ? 3 : 6
        }}
      >
        <HeroSection />
        <FeaturesSection />
        <Testimonials />
        <CallToAction />
      </Container>

      {/* Footer is rendered outside the main Container */}
      <Footer />
    </Box>
  );
};

// Since LandingScreen receives no props, no PropTypes are needed here.

export default LandingScreen;
