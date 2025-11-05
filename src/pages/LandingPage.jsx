// src/pages/LandingPage.jsx
import React, { useCallback, useMemo, lazy, Suspense } from "react";
import {
  Box,
  Container,
  useTheme,
  useMediaQuery,
  Fade,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/common/Navbar.jsx";
import Footer from "../components/common/Footer.jsx";

// Lazy load heavy sections
const HeroSection = lazy(() => import("../components/layout/HeroSection.jsx"));
const FeaturesSection = lazy(() => import("../components/layout/FeaturesSection.jsx"));
const Testimonials = lazy(() => import("../components/layout/Testimonials.jsx"));
const CallToAction = lazy(() => import("../components/layout/CallToAction.jsx"));

const SectionLoader = () => (
  <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
    <Typography variant="h6">Loading...</Typography>
  </Box>
);

export default function LandingPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const NAVBAR_LINKS = useMemo(
    () => [
      { label: "Features", href: "#features-section" },
      { label: "Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
      { label: "Documentation", href: "https://docs.assessly.com", external: true },
    ],
    []
  );

  const handleNavigation = useCallback(
    (path) => {
      if (path.startsWith("#")) {
        const sectionId = path.substring(1);
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (path.startsWith("http")) {
        window.open(path, "_blank", "noopener,noreferrer");
      } else {
        navigate(path);
      }
    },
    [navigate]
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column", width: "100%", overflowX: "hidden" }}>
      <Navbar links={NAVBAR_LINKS} />

      <Suspense fallback={<SectionLoader />}>
        <HeroSection
          // Use /assets/Assessly.mp4 which is a safe path for built/public assets.
          videoUrl="/assets/Assessly.mp4"
          fallbackImage="/assets/hero-fallback.jpg"
          enableAudio={false}
          // hero component should handle controls; we provide safe props
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

      <Footer />
      <ScrollToTopButton />
      <StructuredData />
      <CriticalImagePreload />
    </Box>
  );
}

// Scroll-to-top button (memoized)
const ScrollToTopButton = React.memo(() => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setIsVisible(window.pageYOffset > 300);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);
  return (
    <Fade in={isVisible} timeout={500}>
      <Box
        component="button"
        onClick={scrollToTop}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          bgcolor: "primary.main",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: 56,
          height: 56,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          "&:hover": { bgcolor: "primary.dark", transform: "translateY(-4px) scale(1.05)" },
        }}
        aria-label="Scroll to top"
      >
        ↑
      </Box>
    </Fade>
  );
});

// SEO structured data
const StructuredData = React.memo(() => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Assessly",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web Browser",
        description: "Modern assessment SaaS platform for creating, managing, and analyzing assessments at scale.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "500" },
      }),
    }}
  />
));

// Programmatic preload for critical image
const CriticalImagePreload = React.memo(() => {
  React.useEffect(() => {
    try {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = "/assets/hero-fallback.jpg";
      link.fetchPriority = "high";
      document.head.appendChild(link);
      return () => {
        if (document.head.contains(link)) document.head.removeChild(link);
      };
    } catch {
      // ignore
    }
    return undefined;
  }, []);
  return null;
});
