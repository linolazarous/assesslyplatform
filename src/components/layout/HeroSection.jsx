import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Container,
  alpha,
} from "@mui/material";
import { PlayArrow, Pause, VolumeUp, VolumeOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Logo } from "../brand";
import PropTypes from "prop-types";

// ✅ Safe asset URL handling for Vite/Render
const getAssetUrl = (path) => {
  try {
    return new URL(path, import.meta.url).href;
  } catch {
    return path; // fallback to relative
  }
};

const HeroSection = ({
  videoUrl = "/Assessly.mp4",
  fallbackImage = "/hero-fallback.jpg",
  enableAudio = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [videoState, setVideoState] = useState({
    isPlaying: true,
    isMuted: true,
    isLoaded: false,
    hasError: false,
  });

  // ✅ Event Handlers
  const handleVideoLoad = useCallback(() => {
    setVideoState((prev) => ({ ...prev, isLoaded: true }));
  }, []);

  const handleVideoError = useCallback(() => {
    console.warn("⚠️ Hero video failed to load, switching to fallback image.");
    setVideoState((prev) => ({ ...prev, hasError: true, isPlaying: false }));
  }, []);

  const togglePlayback = useCallback(() => {
    setVideoState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const toggleMute = useCallback(() => {
    if (enableAudio) {
      setVideoState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, [enableAudio]);

  const handleCTAClick = useCallback(
    (type) => {
      if (type === "signup") {
        navigate("/auth?tab=signup", { state: { from: "hero_cta" } });
      } else {
        const section = document.getElementById("features-section");
        section
          ? section.scrollIntoView({ behavior: "smooth", block: "start" })
          : window.scrollTo({ top: 600, behavior: "smooth" });
      }
    },
    [navigate]
  );

  const gradientOverlay = useMemo(
    () =>
      `linear-gradient(135deg, 
        ${alpha(theme.palette.primary.dark, 0.7)} 0%, 
        ${alpha(theme.palette.secondary.dark, 0.5)} 50%, 
        ${alpha(theme.palette.background.paper, 0.3)} 100%
      )`,
    [theme]
  );

  const ctaButtons = useMemo(
    () => [
      {
        label: "Get Started Free",
        variant: "contained",
        onClick: () => handleCTAClick("signup"),
        color: "primary",
      },
      {
        label: "See Features",
        variant: "outlined",
        onClick: () => handleCTAClick("features"),
        color: "inherit",
      },
    ],
    [handleCTAClick]
  );

  return (
    <Box
      component="section"
      aria-label="Hero Section"
      sx={{
        position: "relative",
        minHeight: { xs: "85vh", md: "95vh" },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* ✅ Video Background with graceful fallback */}
      {!videoState.hasError ? (
        <Box
          component="video"
          src={getAssetUrl(videoUrl)}
          autoPlay
          loop
          muted={videoState.isMuted}
          playsInline
          preload="metadata"
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "translate(-50%, -50%)",
            zIndex: 0,
            transition: "opacity 0.6s ease",
            opacity: videoState.isLoaded ? 1 : 0,
          }}
        />
      ) : (
        <Box
          component="img"
          src={getAssetUrl(fallbackImage)}
          alt="Assessly Hero Background"
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      )}

      {/* ✅ Gradient Overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: gradientOverlay,
          zIndex: 1,
        }}
      />

      {/* ✅ Content */}
      <Container
        maxWidth="xl"
        sx={{
          position: "relative",
          zIndex: 2,
          py: { xs: 4, md: 8 },
        }}
      >
        <Grid
          container
          spacing={{ xs: 4, md: 6 }}
          alignItems="center"
          sx={{ minHeight: "60vh" }}
        >
          {/* Text */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={800}>
              <Box sx={{ textAlign: { xs: "center", lg: "left" }, maxWidth: 600 }}>
                {isMobile && (
                  <Zoom in timeout={600}>
                    <Box sx={{ mb: 4, display: "flex", justifyContent: "center" }}>
                      <Logo size={70} variant="light" />
                    </Box>
                  </Zoom>
                )}

                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    mb: 3,
                    fontSize: { xs: "2.75rem", sm: "3.5rem", md: "4rem" },
                    lineHeight: 1.1,
                    color: "white",
                    textShadow: "0 4px 8px rgba(0,0,0,0.3)",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Measure{" "}
                  <Box
                    component="span"
                    sx={{
                      background: "linear-gradient(45deg, #fbbf24, #f59e0b, #eab308)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "gradientShift 3s ease infinite",
                    }}
                  >
                    Smarter
                  </Box>
                  , Not Harder
                </Typography>

                <Fade in timeout={1000}>
                  <Typography
                    variant="h5"
                    sx={{
                      mb: 4,
                      color: "rgba(255, 255, 255, 0.95)",
                      fontSize: { xs: "1.125rem", md: "1.375rem" },
                      textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                      lineHeight: 1.6,
                    }}
                  >
                    From Questions to Insights — the modern assessment SaaS
                    trusted by innovators worldwide.
                  </Typography>
                </Fade>

                {/* CTA Buttons */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    justifyContent: { xs: "center", lg: "flex-start" },
                  }}
                >
                  {ctaButtons.map((btn) => (
                    <Zoom key={btn.label} in timeout={900}>
                      <Button
                        variant={btn.variant}
                        color={btn.color}
                        size="large"
                        onClick={btn.onClick}
                        sx={{
                          px: 4,
                          py: 1.5,
                          fontWeight: 700,
                          borderRadius: 3,
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: 8,
                          },
                        }}
                      >
                        {btn.label}
                      </Button>
                    </Zoom>
                  ))}
                </Box>
              </Box>
            </Fade>
          </Grid>

          {/* ✅ Desktop Preview */}
          {!isMobile && (
            <Grid item xs={12} lg={6}>
              <Zoom in timeout={1000}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      maxWidth: 600,
                      borderRadius: 4,
                      overflow: "hidden",
                      boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                      transform: "perspective(1000px) rotateY(-5deg)",
                      transition: "all 0.5s ease",
                      "&:hover": {
                        transform: "perspective(1000px) rotateY(0deg) scale(1.02)",
                        borderColor: alpha(theme.palette.primary.main, 0.6),
                      },
                    }}
                  >
                    <Box
                      component="video"
                      src={getAssetUrl(videoUrl)}
                      autoPlay
                      loop
                      muted={videoState.isMuted}
                      playsInline
                      preload="metadata"
                      style={{
                        width: "100%",
                        display: "block",
                      }}
                    />
                  </Box>
                </Box>
              </Zoom>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* ✅ Global animations */}
      <style>{`
        @keyframes gradientShift {
          0%,100%{background-position:0% 50%}
          50%{background-position:100% 50%}
        }
      `}</style>
    </Box>
  );
};

HeroSection.propTypes = {
  videoUrl: PropTypes.string,
  fallbackImage: PropTypes.string,
  enableAudio: PropTypes.bool,
};

export default React.memo(HeroSection);
