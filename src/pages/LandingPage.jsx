import React, { useCallback, useMemo } from 'react';
import { 
  Box, 
  Container,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Footer from '../components/common/Footer.jsx';

// Import the refined layout components
import HeroSection from '../components/layout/HeroSection.jsx';
import FeaturesSection from '../components/layout/FeaturesSection.jsx';
import Testimonials from '../components/layout/Testimonials.jsx';
import CallToAction from '../components/layout/CallToAction.jsx';

export default function LandingPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const NAVBAR_LINKS = useMemo(() => [
    { label: 'Features', href: '#features-section' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Documentation', href: 'https://docs.assessly.com', external: true },
  ], []);

  const handleNavigation = useCallback((path) => {
    if (path.startsWith('#')) {
      // Handle anchor links
      const sectionId = path.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else if (path.startsWith('http')) {
      // Handle external links
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      // Handle internal navigation
      navigate(path);
    }
  }, [navigate]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }, []);

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        overflowX: 'hidden'
      }}
    >
      {/* Navigation */}
      <Navbar links={NAVBAR_LINKS} />

      {/* Hero Section */}
      <HeroSection 
        videoUrl="/Assessly.mp4"
        fallbackImage="/hero-fallback.jpg"
        enableAudio={false}
      />

      {/* Features Section */}
      <FeaturesSection />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Final Call-to-Action */}
      <CallToAction showPromo={true} />

      {/* Footer */}
      <Footer />

      {/* Enhanced Scroll-to-Top Button */}
      <Fade in timeout={1000}>
        <Box
          component="button"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: 'primary.main',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 56,
            height: 56,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 9999,
            '&:hover': { 
              bgcolor: 'primary.dark',
              transform: 'translateY(-4px) scale(1.1)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            },
            '&:active': {
              transform: 'translateY(-2px) scale(1.05)',
            },
            '&::before': {
              content: '"↑"',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              lineHeight: 1,
            }
          }}
          aria-label="Scroll to top"
        />
      </Fade>

      {/* Performance Optimization - Preload critical resources */}
      <link rel="preload" href="/Assessly.mp4" as="video" type="video/mp4" />
      <link rel="preload" href="/hero-fallback.jpg" as="image" />
      
      {/* Structured Data for SEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Assessly",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web Browser",
          "description": "Modern assessment SaaS platform for creating, managing, and analyzing assessments at scale.",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "500"
          }
        })}
      </script>
    </Box>
  );
}
