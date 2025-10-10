import React from 'react';
import { 
  Box,
  Container,
  useTheme,
  useMediaQuery
} from '@mui/material';
import PropTypes from 'prop-types'; // Import PropTypes if needed later

// NOTE: Assuming these sub-components are located in a child directory (LandingScreen/components)
// and have been renamed to .jsx (or were already .jsx).
import HeroSection from './components/HeroSection.jsx';
import FeaturesSection from './components/FeaturesSection.jsx';
import Testimonials from './components/Testimonials.jsx';
import CallToAction from './components/CallToAction.jsx';
// NOTE: Assuming Footer is located in the common directory and has been renamed to .jsx
import Footer from '../../components/common/Footer.jsx'; 

const LandingScreen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box 
      component="div" // Use a semantic component if possible, or keep as div
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        // Ensure there are no overflow issues
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

      {/* Footer is rendered outside the main Container but within the Box */}
      <Footer />
    </Box>
  );
};

// Since LandingScreen receives no props, no PropTypes are needed here.

export default LandingScreen;
