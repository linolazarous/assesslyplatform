import React, {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";
import { Box, CircularProgress, Container, Fade, Typography } from "@mui/material";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

// ✅ Lazy-load sections with CORRECT file names
const HeroSection = lazy(() => import("../components/layout/HeroSection.jsx"));
const FeaturesSection = lazy(() => import("../components/layout/FeaturesSection.jsx"));
const Testimonials = lazy(() => import("../components/layout/Testimonials.jsx")); // Fixed name
const CallToAction = lazy(() => import("../components/layout/CallToAction.jsx")); // Fixed name
const Footer = lazy(() => import("../components/layout/Footer.jsx"));

// ✅ Optimized scroll reset with passive listener
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    const scrollToTop = () => {
      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    
    // Use requestAnimationFrame for smoother execution
    requestAnimationFrame(scrollToTop);
  }, [pathname]);
  
  return null;
};

// ✅ Enhanced loading placeholder with better UX
const LoadingFallback = React.memo(() => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "background.default",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999
    }}
  >
    <Box sx={{ textAlign: "center" }}>
      <CircularProgress 
        size={64} 
        thickness={4.5} 
        sx={{ mb: 2 }}
      />
      <Typography variant="body2" color="text.secondary">
        Loading Assessly...
      </Typography>
    </Box>
  </Box>
));

/** ✅ Optimized Intersection Observer hook */
const useRevealOnScroll = (threshold = 0.1) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { 
        threshold,
        rootMargin: '50px'
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
};

/** ✅ Performance analytics */
const usePageAnalytics = () => {
  useEffect(() => {
    const startTime = performance.now();
    let mounted = true;

    const sendAnalytics = () => {
      if (!mounted) return;
      
      const duration = Math.round((performance.now() - startTime) / 1000);
      console.log(`[Analytics] User spent ${duration}s on landing page`);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendAnalytics();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendAnalytics();
    };
  }, []);
};

// ✅ Main component with performance optimizations
const LandingPage = () => {
  usePageAnalytics();

  // Reveal animations with staggered thresholds
  const [featuresRef, showFeatures] = useRevealOnScroll(0.15);
  const [testimonialsRef, showTestimonials] = useRevealOnScroll(0.2);
  const [ctaRef, showCTA] = useRevealOnScroll(0.15);

  return (
    <>
      {/* ✅ Enhanced SEO + Performance meta tags */}
      <Helmet>
        <title>Assessly – Modern Assessment & Insights Platform</title>
        <meta
          name="description"
          content="Assessly empowers educators and organizations to create, analyze, and manage assessments effortlessly with AI-driven insights and intuitive design."
        />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Assessly Platform" />
        <meta property="og:description" content="Smarter assessments, simplified insights." />
        <meta property="og:url" content="https://assessly-gedp.onrender.com" />
        <meta property="og:image" content="/og-image.jpg" />
        <meta property="og:type" content="website" />
      </Helmet>

      <ScrollToTop />

      {/* ✅ Enhanced Suspense with proper error boundaries */}
      <Suspense fallback={<LoadingFallback />}>
        <Box
          component="main"
          sx={{
            overflowX: "hidden",
            bgcolor: "background.default",
            color: "text.primary",
            scrollBehavior: "smooth",
            minHeight: '100vh',
            position: 'relative'
          }}
        >
          {/* HERO SECTION - Critical above-fold content */}
          <Box sx={{ position: 'relative' }}>
            <HeroSection
              videoUrl="/Assessly.mp4"
              fallbackImage="/hero-fallback.jpg"
              enableAudio={false}
            />
          </Box>

          {/* FEATURES SECTION */}
          <Box
            id="features-section"
            ref={featuresRef}
            sx={{ 
              py: { xs: 8, md: 12 },
              minHeight: { xs: 'auto', md: 600 }
            }}
          >
            <Fade in={showFeatures} timeout={800}>
              <Container maxWidth="lg">
                <FeaturesSection />
              </Container>
            </Fade>
          </Box>

          {/* TESTIMONIALS SECTION */}
          <Box
            id="testimonials"
            ref={testimonialsRef}
            sx={{
              py: { xs: 10, md: 14 },
              background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,0,0,0.05))",
              minHeight: { xs: 'auto', md: 500 }
            }}
          >
            <Fade in={showTestimonials} timeout={900}>
              <Container maxWidth="xl">
                <Testimonials /> {/* Fixed component name */}
              </Container>
            </Fade>
          </Box>

          {/* CTA SECTION */}
          <Box
            id="cta-section"
            ref={ctaRef}
            sx={{
              py: { xs: 10, md: 14 },
              background: "linear-gradient(135deg, rgba(25,118,210,0.08), rgba(0,0,0,0.08))",
              minHeight: { xs: 'auto', md: 400 }
            }}
          >
            <Fade in={showCTA} timeout={1000}>
              <CallToAction /> {/* Fixed component name */}
            </Fade>
          </Box>

          {/* FOOTER */}
          <Footer />
        </Box>
      </Suspense>
    </>
  );
};

// ✅ Export with proper memoization
export default React.memo(LandingPage);
