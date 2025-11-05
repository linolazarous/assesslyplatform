import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import PropTypes from "prop-types";
import { Logo } from "../brand";

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

  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  // Reveal hero when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const togglePlayback = useCallback(() => {
    setVideoState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const toggleMute = useCallback(() => {
    if (enableAudio) {
      setVideoState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    }
  }, [enableAudio]);

  const handleVideoError = useCallback(() => {
    console.warn("Hero video failed to load, fallback to image");
    setVideoState((prev) => ({ ...prev, hasError: true, isPlaying: false }));
  }, []);

  const handleCTAClick = useCallback(
    (type) => {
      if (type === "signup") {
        navigate("/auth?tab=signup", { state: { from: "hero_cta" } });
      } else {
        const target = document.getElementById("features-section");
        target
          ? target.scrollIntoView({ behavior: "smooth", block: "start" })
          : window.scrollTo({ top: 600, behavior: "smooth" });
      }
    },
    [navigate]
  );

  const gradientOverlay = useMemo(
    () =>
      `linear-gradient(135deg,
        ${alpha(theme.palette.primary.dark, 0.75)} 0%,
        ${alpha(theme.palette.secondary.dark, 0.55)} 50%,
        ${alpha(theme.palette.background.paper, 0.25)} 100%)`,
    [theme]
  );

  const ctaButtons = useMemo(
    () => [
      {
        label: "Get Started Free",
        variant: "contained",
        color: "primary",
        onClick: () => handleCTAClick("signup"),
      },
      {
        label: "See Features",
        variant: "outlined",
        color: "inherit",
        onClick: () => handleCTAClick("features"),
      },
    ],
    [handleCTAClick]
  );

  return (
    <Box
      ref={ref}
      component="section"
      aria-label="Hero section"
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
      {/* Background video / fallback */}
      {!videoState.hasError ? (
        <Box
          component="video"
          src={videoUrl}
          autoPlay
          loop
          muted={videoState.isMuted}
          playsInline
          onError={handleVideoError}
          onLoadedData={() => setVideoState((p) => ({ ...p, isLoaded: true }))}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: videoState.isLoaded ? 1 : 0,
            transition: "opacity 0.5s ease",
            zIndex: 0,
          }}
        />
      ) : (
        <Box
          component="img"
          src={fallbackImage}
          alt="Hero background"
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

      {/* Gradient overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: gradientOverlay,
          zIndex: 1,
        }}
      />

      {/* Content */}
      <Fade in={visible} timeout={800}>
        <Container
          maxWidth="xl"
          sx={{
            position: "relative",
            zIndex: 2,
            py: { xs: 6, md: 10 },
          }}
        >
          <Grid
            container
            spacing={{ xs: 4, md: 6 }}
            alignItems="center"
            justifyContent="center"
          >
            <Grid item xs={12} md={7}>
              <Box textAlign={{ xs: "center", md: "left" }}>
                {isMobile && (
                  <Zoom in>
                    <Box sx={{ mb: 4, display: "flex", justifyContent: "center" }}>
                      <Logo size={70} variant="light" />
                    </Box>
                  </Zoom>
                )}
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "2.5rem", md: "4rem" },
                    color: "white",
                    textShadow: "0 4px 10px rgba(0,0,0,0.3)",
                  }}
                >
                  Measure{" "}
                  <Box
                    component="span"
                    sx={{
                      background: "linear-gradient(45deg,#fbbf24,#f59e0b,#eab308)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "gradientShift 4s ease infinite",
                    }}
                  >
                    Smarter
                  </Box>
                  , Not Harder
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    color: "rgba(255,255,255,0.9)",
                    mt: 3,
                    maxWidth: 480,
                    mx: { xs: "auto", md: 0 },
                    lineHeight: 1.6,
                  }}
                >
                  From questions to insights — Assessly helps organizations
                  design, manage, and analyze assessments effortlessly.
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: { xs: "center", md: "flex-start" },
                    gap: 2,
                    mt: 4,
                    flexWrap: "wrap",
                  }}
                >
                  {ctaButtons.map((btn) => (
                    <Button
                      key={btn.label}
                      variant={btn.variant}
                      color={btn.color}
                      size="large"
                      onClick={btn.onClick}
                      sx={{
                        px: 4,
                        py: 1.75,
                        borderRadius: 3,
                        fontWeight: 700,
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: 6,
                        },
                      }}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Fade>

      <style jsx global>{`
        @keyframes gradientShift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
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
