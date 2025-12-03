// src/components/layout/HeroSection.jsx
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
  Stack,
  Chip,
  IconButton,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { 
  PlayArrow, 
  Pause, 
  VolumeUp, 
  VolumeOff,
  ArrowForward,
  CheckCircle,
  TrendingUp,
  Security,
  BarChart,
  Groups,
  Assessment,
  Download,
  Launch,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { BrandMark, Logo } from "../brand";

const HeroSection = ({
  videoUrl = "/Assessly.mp4",
  fallbackImage = "/hero-fallback.jpg",
  enableAudio = false,
  showStats = true,
  showDemo = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  const [videoState, setVideoState] = useState({
    isPlaying: true,
    isMuted: true,
    isLoaded: false,
    hasError: false,
  });

  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState({
    assessments: 12500,
    candidates: 85000,
    organizations: 350,
    accuracy: "99.8%",
  });
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

  // Animate stats counter
  useEffect(() => {
    if (visible && showStats) {
      const timer = setTimeout(() => {
        setStats({
          assessments: 12500,
          candidates: 85000,
          organizations: 350,
          accuracy: "99.8%",
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible, showStats]);

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
        navigate("/register");
      } else if (type === "demo") {
        navigate("/demo");
      } else if (type === "contact") {
        navigate("/contact");
      } else {
        const target = document.getElementById("features-section");
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [navigate]
  );

  const gradientOverlay = useMemo(
    () =>
      `linear-gradient(135deg,
        ${alpha(theme.palette.primary.dark, 0.85)} 0%,
        ${alpha(theme.palette.primary.main, 0.75)} 30%,
        ${alpha(theme.palette.secondary.dark, 0.65)} 70%,
        ${alpha(theme.palette.background.paper, 0.25)} 100%)`,
    [theme]
  );

  const ctaButtons = useMemo(
    () => [
      {
        label: "Start Free Trial",
        variant: "contained",
        color: "primary",
        size: "large",
        icon: <ArrowForward />,
        onClick: () => handleCTAClick("signup"),
        highlight: true,
      },
      {
        label: "Book a Demo",
        variant: "outlined",
        color: "inherit",
        size: "large",
        icon: <PlayArrow />,
        onClick: () => handleCTAClick("demo"),
      },
      {
        label: "Contact Sales",
        variant: "text",
        color: "inherit",
        size: "large",
        onClick: () => handleCTAClick("contact"),
      },
    ],
    [handleCTAClick]
  );

  const keyFeatures = useMemo(
    () => [
      { icon: <Assessment />, text: "10+ Question Types" },
      { icon: <BarChart />, text: "Real-time Analytics" },
      { icon: <Groups />, text: "Team Collaboration" },
      { icon: <Security />, text: "Enterprise Security" },
      { icon: <TrendingUp />, text: "Scalable Infrastructure" },
      { icon: <Download />, text: "Offline Capable" },
    ],
    []
  );

  const platformStats = useMemo(
    () => [
      { value: stats.assessments.toLocaleString(), label: "Assessments Created", icon: "📝" },
      { value: stats.candidates.toLocaleString(), label: "Candidates Assessed", icon: "👥" },
      { value: stats.organizations.toLocaleString(), label: "Organizations", icon: "🏢" },
      { value: stats.accuracy, label: "Platform Uptime", icon: "⚡" },
    ],
    [stats]
  );

  return (
    <Box
      ref={ref}
      component="section"
      aria-label="Hero section"
      sx={{
        position: "relative",
        minHeight: { xs: "90vh", md: "100vh" },
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
            filter: "brightness(0.6) contrast(1.2)",
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
            filter: "brightness(0.6) contrast(1.2)",
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

      {/* Floating particles effect */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          opacity: 0.3,
          background: `radial-gradient(circle at 20% 50%, ${alpha(theme.palette.primary.light, 0.2)} 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.light, 0.15)} 0%, transparent 50%)`,
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
            spacing={{ xs: 4, md: 8 }}
            alignItems="center"
            justifyContent="center"
          >
            {/* Left Column - Main Content */}
            <Grid item xs={12} lg={7}>
              <Stack spacing={{ xs: 3, md: 4 }}>
                {/* Logo and Tagline */}
                <Zoom in={visible} style={{ transitionDelay: "100ms" }}>
                  <Box>
                    <BrandMark 
                      size={48} 
                      variant="h4" 
                      color="white"
                      showTagline={!isMobile}
                      tagline="Multitenant Assessment Platform"
                      direction={isMobile ? "column" : "row"}
                      spacing={1}
                    />
                    <Chip
                      label="Enterprise Ready"
                      color="success"
                      size="small"
                      icon={<CheckCircle />}
                      sx={{ 
                        mt: 2,
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        backdropFilter: 'blur(10px)',
                      }}
                    />
                  </Box>
                </Zoom>

                {/* Main Headline */}
                <Box>
                  <Typography
                    variant="h1"
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem", lg: "5rem" },
                      color: "white",
                      textShadow: "0 4px 20px rgba(0,0,0,0.4)",
                      lineHeight: 1.1,
                    }}
                  >
                    From Questions to{" "}
                    <Box
                      component="span"
                      sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light}, ${theme.palette.success.light})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        display: "inline-block",
                      }}
                    >
                      Insights
                    </Box>
                    , Anywhere
                  </Typography>

                  <Typography
                    variant="h4"
                    sx={{
                      color: "rgba(255,255,255,0.9)",
                      mt: 3,
                      fontWeight: 400,
                      maxWidth: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    A modern, enterprise-ready assessment platform that enables 
                    organizations to create, deliver, and analyze assessments 
                    with powerful analytics and seamless user experiences.
                  </Typography>
                </Box>

                {/* Key Features */}
                <Fade in={visible} style={{ transitionDelay: "300ms" }}>
                  <Stack direction="row" flexWrap="wrap" gap={1.5}>
                    {keyFeatures.map((feature, index) => (
                      <Chip
                        key={index}
                        icon={feature.icon}
                        label={feature.text}
                        size="medium"
                        sx={{
                          color: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)',
                          borderColor: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.2)',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Fade>

                {/* CTA Buttons */}
                <Fade in={visible} style={{ transitionDelay: "500ms" }}>
                  <Stack 
                    direction={{ xs: "column", sm: "row" }} 
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    sx={{ mt: 2 }}
                  >
                    {ctaButtons.map((btn, index) => (
                      <Button
                        key={index}
                        variant={btn.variant}
                        color={btn.color}
                        size={btn.size}
                        onClick={btn.onClick}
                        startIcon={btn.icon}
                        endIcon={<Launch />}
                        sx={{
                          px: 4,
                          py: 2,
                          borderRadius: 3,
                          fontWeight: 700,
                          fontSize: '1rem',
                          backdropFilter: 'blur(10px)',
                          borderWidth: btn.variant === 'outlined' ? 2 : 0,
                          ...(btn.highlight && {
                            bgcolor: `${theme.palette.primary.main} !important`,
                            color: 'white !important',
                            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.6)}`,
                            },
                          }),
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            transition: 'all 0.3s ease',
                          },
                        }}
                      >
                        {btn.label}
                      </Button>
                    ))}
                  </Stack>
                </Fade>

                {/* Trust Indicators */}
                <Fade in={visible} style={{ transitionDelay: "700ms" }}>
                  <Box>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" sx={{ mb: 1 }}>
                      Trusted by forward-thinking organizations worldwide
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center">
                      {["Fortune 500", "Startups", "Universities", "Government"].map((item) => (
                        <Chip
                          key={item}
                          label={item}
                          size="small"
                          variant="outlined"
                          sx={{
                            color: 'rgba(255,255,255,0.9)',
                            borderColor: 'rgba(255,255,255,0.2)',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Fade>
              </Stack>
            </Grid>

            {/* Right Column - Stats & Demo Preview */}
            <Grid item xs={12} lg={5}>
              <Zoom in={visible} style={{ transitionDelay: "900ms" }}>
                <Card
                  elevation={8}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden',
                  }}
                >
                  {/* Video Controls */}
                  <Box sx={{ position: 'relative', bgcolor: 'grey.900' }}>
                    <Box
                      component="img"
                      src="/dashboard-preview.png"
                      alt="Assessly Platform Dashboard Preview"
                      sx={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        opacity: 0.9,
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        display: 'flex',
                        gap: 1,
                      }}
                    >
                      {enableAudio && (
                        <IconButton
                          size="small"
                          onClick={toggleMute}
                          sx={{
                            bgcolor: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                          }}
                        >
                          {videoState.isMuted ? <VolumeOff /> : <VolumeUp />}
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={togglePlayback}
                        sx={{
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                        }}
                      >
                        {videoState.isPlaying ? <Pause /> : <PlayArrow />}
                      </IconButton>
                    </Box>
                  </Box>

                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      Platform Overview
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      See how organizations use Assessly to streamline their assessment workflows
                      and gain actionable insights.
                    </Typography>

                    {/* Stats */}
                    {showStats && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Grid container spacing={2}>
                          {platformStats.map((stat, index) => (
                            <Grid item xs={6} key={index}>
                              <Box sx={{ textAlign: 'center', p: 1 }}>
                                <Typography 
                                  variant="h4" 
                                  fontWeight={800}
                                  color="primary.main"
                                  gutterBottom
                                >
                                  {stat.value}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {stat.label}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}

                    {showDemo && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        size="large"
                        startIcon={<PlayArrow />}
                        onClick={() => handleCTAClick("demo")}
                        sx={{ mt: 3, borderRadius: 2, py: 1.5 }}
                      >
                        Watch Full Demo
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          </Grid>
        </Container>
      </Fade>

      {/* Scroll Indicator */}
      <Fade in={visible} style={{ transitionDelay: "1200ms" }}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 40,
              border: `2px solid ${alpha(theme.palette.common.white, 0.5)}`,
              borderRadius: 12,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 4,
                height: 8,
                borderRadius: 2,
                bgcolor: theme.palette.common.white,
                animation: 'scrollIndicator 2s infinite',
              },
            }}
          />
        </Box>
      </Fade>

      <style jsx global>{`
        @keyframes scrollIndicator {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
            opacity: 0.4;
          }
          50% {
            transform: translateX(-50%) translateY(10px);
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
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
  showStats: PropTypes.bool,
  showDemo: PropTypes.bool,
};

HeroSection.defaultProps = {
  enableAudio: false,
  showStats: true,
  showDemo: false,
};

export default React.memo(HeroSection);
