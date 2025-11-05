import React, {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Box, CircularProgress, Container, Fade } from "@mui/material";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

// ✅ Lazy-load sections for improved TTI (time-to-interactive)
const HeroSection = lazy(() => import("../components/layout/HeroSection"));
const FeaturesSection = lazy(() => import("../components/sections/FeaturesSection"));
const TestimonialsSection = lazy(() => import("../components/sections/TestimonialsSection"));
const CTASection = lazy(() => import("../components/sections/CTASection"));
const Footer = lazy(() => import("../components/layout/Footer"));

// ✅ Scroll reset on navigation change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
};

// ✅ Loading placeholder
const LoadingFallback = () => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "background.default",
    }}
  >
    <CircularProgress size={64} thickness={4.5} />
  </Box>
);

/** ✅ Custom Hook: Intersection-based reveal animation */
const useRevealOnScroll = (threshold = 0.2) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
};

/** ✅ Prefetch key sections after first paint for smoother experience */
const useDynamicPrefetch = (modules = []) => {
  useEffect(() => {
    const timeout = setTimeout(() => {
      modules.forEach((mod) => import(mod).catch(() => {}));
    }, 2500); // preload after 2.5s idle
    return () => clearTimeout(timeout);
  }, [modules]);
};

/** ✅ Engagement Tracker (minimal version) */
const usePageAnalytics = () => {
  useEffect(() => {
    const start = performance.now();
    const handleUnload = () => {
      const duration = Math.round((performance.now() - start) / 1000);
      console.log(`[Assessly Analytics] User stayed ${duration}s on LandingPage`);
      // Example: send to your analytics API
      // fetch("/api/analytics/page", { method: "POST", body: JSON.stringify({ page: "landing", duration }) });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
};

const LandingPage = () => {
  // Prefetch secondary sections
  useDynamicPrefetch([
    "../components/sections/FeaturesSection",
    "../components/sections/TestimonialsSection",
    "../components/sections/CTASection",
  ]);

  // Simple analytics tracker
  usePageAnalytics();

  // Reveal animations
  const [featuresRef, showFeatures] = useRevealOnScroll(0.2);
  const [testimonialsRef, showTestimonials] = useRevealOnScroll(0.25);
  const [ctaRef, showCTA] = useRevealOnScroll(0.25);

  return (
    <>
      {/* ✅ SEO + OG metadata */}
      <Helmet>
        <title>Assessly – Modern Assessment & Insights Platform</title>
        <meta
          name="description"
          content="Assessly empowers educators and organizations to create, analyze, and manage assessments effortlessly with AI-driven insights and intuitive design."
        />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Assessly Platform" />
        <meta property="og:description" content="Smarter assessments, simplified insights." />
        <meta property="og:url" content="https://assesslyplatform.onrender.com" />
        <meta property="og:image" content="/og-image.jpg" />
      </Helmet>

      <ScrollToTop />

      <Suspense fallback={<LoadingFallback />}>
        <Box
          component="main"
          sx={{
            overflowX: "hidden",
            bgcolor: "background.default",
            color: "text.primary",
            scrollBehavior: "smooth",
          }}
        >
          {/* HERO */}
          <HeroSection
            videoUrl="/Assessly.mp4"
            fallbackImage="/hero-fallback.jpg"
            enableAudio={false}
          />

          {/* FEATURES */}
          <Box
            id="features-section"
            ref={featuresRef}
            sx={{ py: { xs: 8, md: 12 } }}
          >
            <Fade in={showFeatures} timeout={700}>
              <Container maxWidth="lg">
                <FeaturesSection />
              </Container>
            </Fade>
          </Box>

          {/* TESTIMONIALS */}
          <Box
            id="testimonials"
            ref={testimonialsRef}
            sx={{
              py: { xs: 10, md: 14 },
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,0,0,0.05))",
            }}
          >
            <Fade in={showTestimonials} timeout={900}>
              <Container maxWidth="xl">
                <TestimonialsSection />
              </Container>
            </Fade>
          </Box>

          {/* CTA */}
          <Box
            id="cta-section"
            ref={ctaRef}
            sx={{
              py: { xs: 10, md: 14 },
              background:
                "linear-gradient(135deg, rgba(25,118,210,0.08), rgba(0,0,0,0.08))",
            }}
          >
            <Fade in={showCTA} timeout={1000}>
              <CTASection />
            </Fade>
          </Box>

          {/* FOOTER */}
          <Footer />
        </Box>
      </Suspense>
    </>
  );
};

export default React.memo(LandingPage);
