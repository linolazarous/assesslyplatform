import React, { useState, useCallback, useMemo } from 'react';
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
  alpha
} from '@mui/material';
import { 
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../brand';
import PropTypes from 'prop-types';

const HeroSection = ({ 
  videoUrl = '/Assessly.mp4',
  fallbackImage = '/hero-fallback.jpg',
  enableAudio = false 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [videoState, setVideoState] = useState({
    isPlaying: true,
    isMuted: true,
    isLoaded: false,
    hasError: false
  });

  // Memoized video handlers
  const handleVideoPlay = useCallback(() => {
    setVideoState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const handleVideoPause = useCallback(() => {
    setVideoState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const handleVideoLoad = useCallback(() => {
    setVideoState(prev => ({ ...prev, isLoaded: true }));
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoState(prev => ({ ...prev, hasError: true, isPlaying: false }));
  }, []);

  const togglePlayback = useCallback(() => {
    setVideoState(prev => ({ 
      ...prev, 
      isPlaying: !prev.isPlaying 
    }));
  }, []);

  const toggleMute = useCallback(() => {
    if (enableAudio) {
      setVideoState(prev => ({ 
        ...prev, 
        isMuted: !prev.isMuted 
      }));
    }
  }, [enableAudio]);

  const handleCTAClick = useCallback((type) => {
    if (type === 'signup') {
      navigate('/auth?tab=signup', { 
        state: { from: 'hero_cta' } 
      });
    } else {
      const featuresSection = document.getElementById('features-section');
      if (featuresSection) {
        featuresSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  }, [navigate]);

  // Memoized gradient overlay
  const gradientOverlay = useMemo(() => 
    `linear-gradient(135deg, 
      ${alpha(theme.palette.primary.dark, 0.7)} 0%, 
      ${alpha(theme.palette.secondary.dark, 0.5)} 50%, 
      ${alpha(theme.palette.background.paper, 0.3)} 100%
    )`, 
    [theme]
  );

  // Fixed: Remove TypeScript 'as const' assertions for JavaScript
  const ctaButtons = useMemo(() => [
    {
      label: 'Get Started Free',
      variant: 'contained',
      onClick: () => handleCTAClick('signup'),
      color: 'primary'
    },
    {
      label: 'See Features',
      variant: 'outlined',
      onClick: () => handleCTAClick('features'),
      color: 'inherit'
    }
  ], [handleCTAClick]);

  return (
    <Box
      component="section"
      aria-label="Hero section"
      sx={{
        position: 'relative',
        minHeight: { xs: '85vh', md: '95vh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: theme.palette.background.default,
      }}
    >
      {/* Video Background with Error Fallback */}
      {!videoState.hasError ? (
        <Box
          component="video"
          src={videoUrl}
          autoPlay
          loop
          muted={videoState.isMuted}
          playsInline
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
            transition: 'opacity 0.5s ease',
            opacity: videoState.isLoaded ? 1 : 0
          }}
        />
      ) : (
        <Box
          component="img"
          src={fallbackImage}
          alt="Background"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0
          }}
        />
      )}

      {/* Enhanced Gradient Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: gradientOverlay,
          zIndex: 1,
        }}
      />

      {/* Animated Background Pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.light, 0.1)} 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.light, 0.1)} 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, ${alpha(theme.palette.info.light, 0.05)} 0%, transparent 50%)
          `,
          zIndex: 1,
          animation: 'float 6s ease-in-out infinite'
        }}
      />

      {/* Content */}
      <Container 
        maxWidth="xl" 
        sx={{ 
          position: 'relative', 
          zIndex: 2, 
          py: { xs: 4, md: 8 } 
        }}
      >
        <Grid 
          container 
          spacing={{ xs: 4, md: 6 }} 
          alignItems="center" 
          sx={{ minHeight: '60vh' }}
        >
          {/* Text Content */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={800}>
              <Box sx={{ 
                textAlign: { xs: 'center', lg: 'left' },
                maxWidth: { lg: 600 }
              }}>
                {/* Logo for mobile */}
                {isMobile && (
                  <Zoom in timeout={600}>
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                      <Logo size={70} variant="light" />
                    </Box>
                  </Zoom>
                )}

                {/* Main Heading */}
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    fontWeight: 900,
                    mb: 3,
                    fontSize: { 
                      xs: '2.75rem', 
                      sm: '3.5rem', 
                      md: '4rem',
                      lg: '4.5rem' 
                    },
                    lineHeight: 1.1,
                    color: 'white',
                    textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Measure{' '}
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(45deg, #fbbf24, #f59e0b, #eab308)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundSize: '200% 200%',
                      animation: 'gradientShift 3s ease infinite'
                    }}
                  >
                    Smarter
                  </Box>
                  , Not Harder
                </Typography>

                {/* Subtitle */}
                <Fade in timeout={1000}>
                  <Typography
                    variant="h5"
                    component="p"
                    sx={{
                      mb: 4,
                      color: 'rgba(255, 255, 255, 0.95)',
                      fontSize: { 
                        xs: '1.125rem', 
                        md: '1.375rem' 
                      },
                      maxWidth: 500,
                      mx: { xs: 'auto', lg: 0 },
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      fontWeight: 400,
                      lineHeight: 1.6
                    }}
                  >
                    From Questions to Insights, Anywhere — A modern assessment SaaS platform 
                    trusted by forward-thinking organizations worldwide.
                  </Typography>
                </Fade>

                {/* CTA Buttons */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    justifyContent: { xs: 'center', lg: 'flex-start' },
                    flexWrap: 'wrap',
                    mb: 3
                  }}
                >
                  {ctaButtons.map((button, index) => (
                    <Zoom in key={button.label} timeout={800} style={{ delay: 200 + (index * 100) }}>
                      <Button
                        variant={button.variant}
                        size="large"
                        onClick={button.onClick}
                        color={button.color}
                        sx={{ 
                          px: 4,
                          py: 1.75,
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          borderRadius: 3,
                          minWidth: { xs: '200px', md: 'auto' },
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 8,
                          }
                        }}
                      >
                        {button.label}
                      </Button>
                    </Zoom>
                  ))}
                </Box>

                {/* Trust Indicator */}
                <Fade in timeout={1400}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      mt: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: { xs: 'center', lg: 'flex-start' },
                      gap: 1,
                      flexWrap: 'wrap'
                    }}
                  >
                    <Box 
                      component="span" 
                      sx={{ 
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      ⭐⭐⭐⭐⭐
                    </Box>
                    Trusted by 500+ companies worldwide
                  </Typography>
                </Fade>
              </Box>
            </Fade>
          </Grid>

          {/* Video Preview for desktop */}
          {!isMobile && (
            <Grid item xs={12} lg={6}>
              <Zoom in timeout={1000}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 600,
                      borderRadius: 4,
                      overflow: 'hidden',
                      boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                      transform: 'perspective(1000px) rotateY(-5deg)',
                      transition: 'all 0.5s ease',
                      '&:hover': {
                        transform: 'perspective(1000px) rotateY(0deg) scale(1.02)',
                        borderColor: alpha(theme.palette.primary.main, 0.6),
                      }
                    }}
                  >
                    {/* Video Controls Overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        display: 'flex',
                        gap: 1,
                        zIndex: 3
                      }}
                    >
                      {enableAudio && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={toggleMute}
                          startIcon={videoState.isMuted ? <VolumeOff /> : <VolumeUp />}
                          sx={{
                            minWidth: 'auto',
                            borderRadius: 2,
                            bgcolor: 'rgba(0,0,0,0.7)',
                            '&:hover': {
                              bgcolor: 'rgba(0,0,0,0.9)',
                            }
                          }}
                        />
                      )}
                      <Button
                        variant="contained"
                        size="small"
                        onClick={togglePlayback}
                        startIcon={videoState.isPlaying ? <Pause /> : <PlayArrow />}
                        sx={{
                          minWidth: 'auto',
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.7)',
                          '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.9)',
                          }
                        }}
                      />
                    </Box>
                    
                    <Box
                      component="video"
                      src={videoUrl}
                      autoPlay
                      loop
                      muted={videoState.isMuted}
                      playsInline
                      sx={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </Box>
                </Box>
              </Zoom>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Scroll Indicator */}
      {!isMobile && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            animation: 'bounce 2s infinite'
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 50,
              border: `2px solid ${alpha('#fff', 0.5)}`,
              borderRadius: 15,
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
                backgroundColor: alpha('#fff', 0.8),
                animation: 'scroll 2s infinite'
              }
            }}
          />
        </Box>
      )}

      {/* Global Animations */}
      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) translateX(-50%); }
          40% { transform: translateY(-10px) translateX(-50%); }
          60% { transform: translateY(-5px) translateX(-50%); }
        }
        
        @keyframes scroll {
          0% { opacity: 0; transform: translateX(-50%) translateY(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
      `}</style>
    </Box>
  );
};

HeroSection.propTypes = { 
  videoUrl: PropTypes.string,
  fallbackImage: PropTypes.string,
  enableAudio: PropTypes.bool
};

HeroSection.defaultProps = {
  videoUrl: '/Assessly.mp4',
  fallbackImage: '/hero-fallback.jpg',
  enableAudio: false
};

export default React.memo(HeroSection);
