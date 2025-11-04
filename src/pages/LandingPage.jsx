import React, { useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  Box, 
  Container,
  useTheme,
  useMediaQuery,
  Fade,
  Typography // Added missing import
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Footer from '../components/common/Footer.jsx';

// Lazy load heavy components for better performance
const HeroSection = lazy(() => import('../components/layout/HeroSection.jsx'));
const FeaturesSection = lazy(() => import('../components/layout/FeaturesSection.jsx'));
const Testimonials = lazy(() => import('../components/layout/Testimonials.jsx'));
const CallToAction = lazy(() => import('../components/layout/CallToAction.jsx'));

// Loading fallback component
const SectionLoader = () => (
  <Box sx={{ 
    height: 400, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    bgcolor: 'background.default'
  }}>
    <Typography variant="h6">Loading...</Typography>
  </Box>
);

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
      const sectionId = path.substring(1);
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else if (path.startsWith('http')) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
    }
  }, [navigate]);

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
      {/* Navigation - Keep this eager loaded */}
      <Navbar links={NAVBAR_LINKS} />

      {/* Lazy loaded sections with Suspense */}
      <Suspense fallback={<SectionLoader />}>
        <HeroSection 
          videoUrl="/Assessly.mp4"
          fallbackImage="/hero-fallback.jpg"
          enableAudio={false}
        />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <FeaturesSection />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <Testimonials />
      </Suspense>

      <Suspense fallback={<SectionLoader />}>
        <CallToAction showPromo={true} />
      </Suspense>

      {/* Footer */}
      <Footer />

      {/* Scroll-to-Top - Only show after scrolling */}
      <ScrollToTopButton />
      
      {/* Structured Data for SEO */}
      <StructuredData />

      {/* Hidden preload for critical above-fold image - FIXED approach */}
      <CriticalImagePreload />
    </Box>
  );
}

// Extracted ScrollToTop component for better performance
const ScrollToTopButton = React.memo(() => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }, []);

  return (
    <Fade in={isVisible} timeout={500}>
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
  );
});

// Extracted Structured Data component
const StructuredData = React.memo(() => (
  <script 
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
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
      })
    }}
  />
));

// Fixed preload approach - prevents console warnings
const CriticalImagePreload = React.memo(() => {
  React.useEffect(() => {
    // Programmatic preload that won't cause console warnings
    if (typeof window !== 'undefined' && 'linkPreload' in window) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = '/hero-fallback.jpg';
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      // Cleanup if component unmounts quickly
      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, []);

  return null; // No DOM output
});
