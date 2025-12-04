// src/pages/LandingPage.jsx
import React, { Suspense, lazy, useEffect, useRef, useState, useMemo } from 'react';
import {
  Box,
  CircularProgress,
  Container,
  Fade,
  Typography,
  useTheme,
  alpha,
  useMediaQuery,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';

/* -------------------------
   Lazy Components with Prefetch
   ------------------------- */
const HeroSection = lazy(() => 
  import('../components/layout/HeroSection.jsx')
    .then(module => ({ default: module.default }))
    .catch(() => ({ default: () => <div>Hero Section Failed to Load</div> }))
);

const FeaturesSection = lazy(() => 
  import('../components/layout/FeaturesSection.jsx')
    .then(module => ({ default: module.default }))
);

const Testimonials= lazy(() => 
  import('../components/layout/Testimonials.jsx')
    .then(module => ({ default: module.default }))
);

const PricingSection = lazy(() => 
  import('../components/layout/PricingSection.jsx')
    .then(module => ({ default: module.default }))
);

const CallToAction = lazy(() => 
  import('../components/layout/CallToAction.jsx')
    .then(module => ({ default: module.default }))
);

const Footer = lazy(() => 
  import('../components/layout/Footer.jsx')
    .then(module => ({ default: module.default }))
);

/* -------------------------
   Custom Components
   ------------------------- */

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pathname]);
  
  return null;
};

// Loading fallback with branding
const LoadingFallback = React.memo(() => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.secondary.light, 0.05)} 100%)`,
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading Assessly Platform"
    >
      <Box sx={{ textAlign: 'center', px: 2 }}>
        <Box
          sx={{
            mb: 4,
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.7 },
            },
          }}
        >
          <CircularProgress 
            size={64} 
            thickness={4.5}
            sx={{ 
              mb: 2,
              color: theme.palette.primary.main,
            }}
          />
        </Box>
        <Typography variant="h5" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
          Assessly Platform
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
          Loading your assessment experience...
        </Typography>
      </Box>
    </Box>
  );
});
LoadingFallback.displayName = 'LoadingFallback';

// Intersection observer hook with cleanup
const useRevealOnScroll = (threshold = 0.1, rootMargin = '50px') => {
  const [ref, setRef] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!ref) return;

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observerRef.current?.unobserve(entry.target);
        }
      },
      { 
        threshold, 
        rootMargin,
        root: null,
      }
    );

    observerRef.current.observe(ref);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [ref, threshold, rootMargin]);

  return [setRef, isVisible];
};

// Section wrapper component
const SectionWrapper = ({ children, id, bgColor = 'transparent', py = { xs: 8, md: 12 }, delay = 0 }) => {
  const [setRef, isVisible] = useRevealOnScroll(0.1);
  const theme = useTheme();
  
  return (
    <Box
      id={id}
      ref={setRef}
      sx={{
        py,
        background: bgColor,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Fade in={isVisible} timeout={800 + delay} mountOnEnter unmountOnExit>
        <Box>
          <Container maxWidth="lg">
            {children}
          </Container>
        </Box>
      </Fade>
    </Box>
  );
};

// Page analytics and tracking
const usePageAnalytics = () => {
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const startTime = Date.now();
    let pageViewSent = false;

    // Track page view
    const trackPageView = () => {
      if (pageViewSent) return;
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      const analyticsData = {
        page: 'landing',
        duration,
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      };

      // Send to analytics API
      try {
        fetch('/api/analytics/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analyticsData),
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }

      pageViewSent = true;
    };

    // Track visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackPageView();
      }
    };

    // Track before unload
    const handleBeforeUnload = () => {
      trackPageView();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Auto-track after 5 seconds
    const autoTrackTimer = setTimeout(trackPageView, 5000);

    // Track CTA clicks
    const trackCTA = (action) => {
      try {
        fetch('/api/analytics/cta-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            page: 'landing',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('CTA tracking error:', error);
      }
    };

    // Add tracking to CTA buttons
    const ctaButtons = document.querySelectorAll('[data-track-cta]');
    ctaButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const action = e.target.dataset.trackCta || 'unknown';
        trackCTA(action);
      });
    });

    return () => {
      clearTimeout(autoTrackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up event listeners
      ctaButtons.forEach(button => {
        button.removeEventListener('click', trackCTA);
      });
    };
  }, [showSnackbar, navigate, location]);
};

/* -------------------------
   LandingPage Component
   ------------------------- */
const LandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Use analytics
  usePageAnalytics();

  // Prefetch critical components
  useEffect(() => {
    const prefetchComponents = async () => {
      try {
        // Preload critical components
        const preloads = [
          import('../components/layout/HeroSection.jsx'),
          import('../components/layout/FeaturesSection.jsx'),
        ];
        
        await Promise.all(preloads.map(importFn => importFn.catch(() => null)));
      } catch (error) {
        console.warn('Component prefetch failed:', error);
      }
    };

    prefetchComponents();
  }, []);

  // SEO metadata
  const seoMetadata = useMemo(() => ({
    title: 'Assessly Platform | Modern Assessment & Analytics Solution',
    description: 'B2B SaaS platform for creating, managing, and analyzing assessments with AI-powered insights. Trusted by organizations worldwide.',
    keywords: 'assessment platform, B2B SaaS, online testing, employee evaluation, skills assessment, learning analytics',
    ogImage: '/og-assessly-platform.jpg',
    canonical: 'https://assessly-gedp.onrender.com',
  }), []);

  return (
    <>
      <Helmet>
        <title>{seoMetadata.title}</title>
        <meta name="description" content={seoMetadata.description} />
        <meta name="keywords" content={seoMetadata.keywords} />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content={seoMetadata.title} />
        <meta property="og:description" content={seoMetadata.description} />
        <meta property="og:url" content={seoMetadata.canonical} />
        <meta property="og:image" content={seoMetadata.ogImage} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Assessly Platform" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoMetadata.title} />
        <meta name="twitter:description" content={seoMetadata.description} />
        <meta name="twitter:image" content={seoMetadata.ogImage} />
        <link rel="canonical" href={seoMetadata.canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Assessly Platform",
            "description": seoMetadata.description,
            "url": seoMetadata.canonical,
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          })}
        </script>
      </Helmet>

      <ScrollToTop />

      <Suspense fallback={<LoadingFallback />}>
        <Box
          component="main"
          sx={{
            overflowX: 'hidden',
            bgcolor: 'background.default',
            color: 'text.primary',
            minHeight: '100vh',
            position: 'relative',
            '& section': {
              scrollMarginTop: isMobile ? '80px' : '100px',
            },
          }}
        >
          {/* Hero Section */}
          <Box sx={{ position: 'relative' }}>
            <Suspense fallback={<Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
              <HeroSection 
                videoUrl="/Assessly.mp4"
                fallbackImage="/hero-fallback.jpg"
                enableAudio={false}
                title="Measure Smarter, Not Harder"
                subtitle="From Questions to Insights, Anywhere"
                ctaText="Start Free Trial"
                ctaLink="/auth?mode=signup"
              />
            </Suspense>
          </Box>

          {/* Features Section */}
          <SectionWrapper
            id="features"
            bgColor={`linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.secondary.light, 0.02)} 100%)`}
            py={{ xs: 8, md: 12 }}
            delay={200}
          >
            <Suspense fallback={<Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
              <FeaturesSection />
            </Suspense>
          </SectionWrapper>

          {/* Testimonials Section */}
          <SectionWrapper
            id="testimonials"
            bgColor={`linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.08)} 0%, ${alpha(theme.palette.success.light, 0.04)} 100%)`}
            py={{ xs: 10, md: 14 }}
            delay={400}
          >
            <Suspense fallback={<Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
              <TestimonialsSection />
            </Suspense>
          </SectionWrapper>

          {/* Pricing Section */}
          <SectionWrapper
            id="pricing"
            bgColor={`linear-gradient(135deg, ${alpha(theme.palette.grey[50], 0.8)} 0%, ${alpha(theme.palette.grey[100], 0.6)} 100%)`}
            py={{ xs: 10, md: 14 }}
            delay={600}
          >
            <Suspense fallback={<Box sx={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
              <PricingSection />
            </Suspense>
          </SectionWrapper>

          {/* Call to Action Section */}
          <SectionWrapper
            id="cta"
            bgColor={`linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`}
            py={{ xs: 12, md: 16 }}
            delay={800}
          >
            <Suspense fallback={<Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>}>
              <CallToAction 
                title="Ready to Transform Your Assessment Process?"
                subtitle="Join thousands of organizations using Assessly Platform"
                primaryCta={{
                  text: "Start Free Trial",
                  link: "/auth?mode=signup",
                  variant: "contained",
                  size: "large",
                  trackLabel: "landing_cta_primary",
                }}
                secondaryCta={{
                  text: "Schedule Demo",
                  link: "/demo",
                  variant: "outlined",
                  size: "large",
                  trackLabel: "landing_cta_secondary",
                }}
              />
            </Suspense>
          </SectionWrapper>

          {/* Footer */}
          <Box
            sx={{
              background: `linear-gradient(180deg, ${theme.palette.grey[900]} 0%, ${theme.palette.grey[900]} 100%)`,
              color: theme.palette.grey[100],
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              },
            }}
          >
            <Suspense fallback={<Box sx={{ height: 400, bgcolor: 'grey.900' }} />}>
              <Footer />
            </Suspense>
          </Box>

          {/* Floating Action Button for Mobile */}
          {isMobile && (
            <Box
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
              }}
            >
              <Fade in timeout={1000}>
                <Box
                  component="a"
                  href="/auth?mode=signup"
                  data-track-cta="mobile_floating_cta"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    color: 'white',
                    textDecoration: 'none',
                    boxShadow: theme.shadows[8],
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: theme.shadows[12],
                    },
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Try
                  </Typography>
                </Box>
              </Fade>
            </Box>
          )}
        </Box>
      </Suspense>
    </>
  );
};

// Performance optimization
export default React.memo(LandingPage);
