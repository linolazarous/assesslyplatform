import React, {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState
} from "react";
import {
  Box,
  CircularProgress,
  Container,
  Fade,
  Typography
} from "@mui/material";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

// Lazy-loaded components
const HeroSection = lazy(() => import("../components/layout/HeroSection.jsx"));
const FeaturesSection = lazy(() => import("../components/layout/FeaturesSection.jsx"));
const Testimonials = lazy(() => import("../components/layout/Testimonials.jsx"));
const CallToAction = lazy(() => import("../components/layout/CallToAction.jsx"));
const Footer = lazy(() => import("../components/layout/Footer.jsx"));

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [pathname]);
  return null;
};

// Loading fallback
const LoadingFallback = React.memo(() => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "background.default",
      position: "fixed",
      inset: 0,
      zIndex: 9999
    }}
  >
    <Box sx={{ textAlign: "center" }}>
      <CircularProgress size={64} thickness={4.5} sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Loading Assessly...
      </Typography>
    </Box>
  </Box>
));

/** Intersection Observer */
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
      { threshold, rootMargin: "50px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
};

/** Page analytics */
const usePageAnalytics = () => {
  useEffect(() => {
    const start = performance.now();
    let mounted = true;

    const send = () => {
      if (!mounted) return;
      const duration = Math.round((performance.now() - start) / 1000);
      console.log(`[Analytics] User spent ${duration}s on landing page`);
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };

    document.addEventListener("visibilitychange", onHide);

    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", onHide);
      send();
    };
  }, []);
};

// Main Page
const LandingPage = () => {
  usePageAnalytics();

  const [featuresRef, showFeatures] = useRevealOnScroll(0.15);
  const [testimonialsRef, showTestimonials] = useRevealOnScroll(0.2);
  const [ctaRef, showCTA] = useRevealOnScroll(0.15);
  
  // State for sidebar (you would typically get this from context or props)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>Assessly – Modern Assessment & Insights Platform</title>
        <meta
          name="description"
          content="Assessly empowers educators and organizations to create, analyze, and manage assessments effortlessly with AI-driven insights and intuitive design."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Assessly Platform" />
        <meta property="og:description" content="Smarter assessments, simplified insights." />
        <meta property="og:url" content="https://assessly-gedp.onrender.com" />
        <meta property="og:image" content="/og-image.jpg" />
        <meta property="og:type" content="website" />
      </Helmet>

      <ScrollToTop />

      {/* Main content with inert attribute when sidebar is open */}
      <div {...(isSidebarOpen ? { inert: "" } : {})}>
        <Suspense fallback={<LoadingFallback />}>
          <Box
            component="main"
            sx={{
              overflowX: "hidden",
              bgcolor: "background.default",
              color: "text.primary",
              minHeight: "100vh",
              position: "relative"
            }}
          >
            {/* HERO */}
            <Box sx={{ position: "relative" }}>
              <HeroSection
                videoUrl="/Assessly.mp4"
                fallbackImage="/hero-fallback.jpg"
                enableAudio={false}
              />
            </Box>

            {/* FEATURES */}
            <Box id="features-section" ref={featuresRef} sx={{ py: { xs: 8, md: 12 } }}>
              <Fade in={showFeatures} timeout={800}>
                <Box>
                  <Container maxWidth="lg">
                    <FeaturesSection />
                  </Container>
                </Box>
              </Fade>
            </Box>

            {/* TESTIMONIALS */}
            <Box
              id="testimonials"
              ref={testimonialsRef}
              sx={{
                py: { xs: 10, md: 14 },
                background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,0,0,0.05))"
              }}
            >
              <Fade in={showTestimonials} timeout={900}>
                <Box>
                  <Container maxWidth="xl">
                    <Testimonials />
                  </Container>
                </Box>
              </Fade>
            </Box>

            {/* CTA */}
            <Box
              id="cta-section"
              ref={ctaRef}
              sx={{
                py: { xs: 10, md: 14 },
                background: "linear-gradient(135deg, rgba(25,118,210,0.08), rgba(0,0,0,0.08))"
              }}
            >
              <Fade in={showCTA} timeout={1000}>
                <Box>
                  <CallToAction />
                </Box>
              </Fade>
            </Box>

            {/* FOOTER */}
            <Footer />
          </Box>
        </Suspense>
      </div>

      {/* Example Sidebar */}
      {/* You would typically have a sidebar component here */}
      {/* <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /> */}
    </>
  );
};

export default React.memo(LandingPage);
