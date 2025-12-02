// src/layouts/AuthLayout.jsx
import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  Grid,
  Stack,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Avatar,
  Container,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  Security,
  VerifiedUser,
  Assessment as AssessmentIcon,
  TrendingUp,
  Groups,
  Business,
  ArrowBack,
  Info,
  Language,
  Public,
  Shield,
  Lock,
  VpnKey,
  Fingerprint,
  QrCode2,
  Cloud,
  Storage,
  Speed,
  CheckCircle,
  Error,
  Warning,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSnackbar } from "notistack";
import Logo from "../components/brand/Logo";
import LoadingScreen from "../components/ui/LoadingScreen";

// Lazy load animations
const MotionDiv = lazy(() =>
  import("framer-motion").then((module) => ({ default: module.motion.div }))
);

const AuthLayout = ({ 
  children, 
  darkMode = false, 
  showBranding = true,
  showBackButton = false,
  showLanguageSelector = false,
  showThemeToggle = true,
  showSecurityInfo = true,
  showTermsLink = true,
  showHelp = true,
  maxWidth = "md",
  centered = true,
  fullScreen = false,
  background = "gradient",
  onBack = null,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [isDarkMode, setIsDarkMode] = useState(darkMode);
  const [language, setLanguage] = useState("en");
  const [securityInfoVisible, setSecurityInfoVisible] = useState(true);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [isLoadingAnimations, setIsLoadingAnimations] = useState(true);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Load animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingAnimations(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Animation props
  const motionProps = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { 
      type: "spring", 
      damping: 20, 
      stiffness: 100, 
      duration: 0.5,
    },
  };

  const containerProps = {
    initial: "hidden",
    animate: "visible",
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          delayChildren: 0.2,
          staggerChildren: 0.1,
        },
      },
    },
  };

  const itemProps = {
    variants: {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1 },
    },
  };

  // Handlers
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  }, [onBack, navigate]);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode(!isDarkMode);
    // In a real app, you would update the theme context
    enqueueSnackbar(`Switched to ${!isDarkMode ? "dark" : "light"} mode`, {
      variant: "info",
      autoHideDuration: 2000,
    });
  }, [isDarkMode, enqueueSnackbar]);

  const handleLanguageChange = useCallback((lang) => {
    setLanguage(lang);
    // In a real app, you would update i18n context
    enqueueSnackbar(`Language changed to ${lang.toUpperCase()}`, {
      variant: "info",
      autoHideDuration: 2000,
    });
  }, [enqueueSnackbar]);

  const handleShowQrCode = useCallback(() => {
    setShowQrCode(true);
    // In a real app, you would generate a QR code for mobile login
    enqueueSnackbar("QR code authentication coming soon", {
      variant: "info",
    });
  }, [enqueueSnackbar]);

  // Background styles
  const getBackgroundStyle = () => {
    switch (background) {
      case "gradient":
        return {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        };
      case "gradient-dark":
        return {
          background: "linear-gradient(135deg, #2c3e50 0%, #4a235a 100%)",
        };
      case "pattern":
        return {
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: theme.palette.background.default,
        };
      case "solid":
        return {
          backgroundColor: theme.palette.background.default,
        };
      default:
        return {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        };
    }
  };

  // Security features list
  const securityFeatures = [
    { icon: <Lock />, text: "End-to-end encryption", color: "primary" },
    { icon: <Shield />, text: "GDPR compliant", color: "success" },
    { icon: <Fingerprint />, text: "2FA support", color: "warning" },
    { icon: <Storage />, text: "Secure cloud storage", color: "info" },
  ];

  // Platform benefits
  const platformBenefits = [
    { icon: <AssessmentIcon />, text: "Create powerful assessments" },
    { icon: <TrendingUp />, text: "Advanced analytics & insights" },
    { icon: <Groups />, text: "Team collaboration tools" },
    { icon: <Business />, text: "Enterprise-grade security" },
  ];

  // Languages
  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
  ];

  if (isLoadingAnimations) {
    return <LoadingScreen message="Loading authentication..." type="auth" />;
  }

  if (isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  const renderLeftPanel = () => (
    <Box
      sx={{
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: 8,
        color: "white",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
          zIndex: 0,
        }}
      />
      
      <Suspense fallback={<CircularProgress color="inherit" />}>
        <MotionDiv {...containerProps} style={{ position: "relative", zIndex: 1 }}>
          <MotionDiv {...itemProps}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Logo size={120} darkMode={false} withText={false} />
              <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Assessly
              </Typography>
              <Typography variant="h5" sx={{ opacity: 0.9, mb: 4 }}>
                Measure Smarter, Not Harder
              </Typography>
            </Box>
          </MotionDiv>

          <MotionDiv {...itemProps}>
            <Stack spacing={3} sx={{ maxWidth: 500 }}>
              {platformBenefits.map((benefit, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 2,
                    bgcolor: "rgba(255,255,255,0.1)",
                    borderRadius: 2,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Avatar sx={{ bgcolor: "primary.main" }}>
                    {benefit.icon}
                  </Avatar>
                  <Typography variant="body1" fontWeight="medium">
                    {benefit.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </MotionDiv>

          {showSecurityInfo && (
            <MotionDiv {...itemProps}>
              <Box sx={{ mt: 6, p: 3, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  <Security sx={{ mr: 1, verticalAlign: "middle" }} />
                  Enterprise Security
                </Typography>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {securityFeatures.map((feature, index) => (
                    <Grid item xs={6} key={index}>
                      <Chip
                        icon={feature.icon}
                        label={feature.text}
                        color={feature.color}
                        size="small"
                        sx={{ bgcolor: "rgba(255,255,255,0.2)" }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </MotionDiv>
          )}

          <MotionDiv {...itemProps}>
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Chip
                icon={<VerifiedUser />}
                label="Trusted by 1000+ organizations"
                sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
              />
            </Box>
          </MotionDiv>
        </MotionDiv>
      </Suspense>
    </Box>
  );

  const renderAuthForm = () => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: centered ? "center" : "flex-start",
        p: { xs: 2, sm: 3, md: 4 },
        height: fullScreen ? "100vh" : "auto",
        minHeight: fullScreen ? "100vh" : "auto",
        overflow: "auto",
      }}
    >
      <Suspense fallback={<CircularProgress />}>
        <MotionDiv
          {...motionProps}
          style={{
            width: "100%",
            maxWidth: maxWidth === "xs" ? 400 : 
                     maxWidth === "sm" ? 500 :
                     maxWidth === "md" ? 600 :
                     maxWidth === "lg" ? 800 : 600,
          }}
        >
          <Paper
            elevation={8}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Header with controls */}
            <Box sx={{ mb: 3 }}>
              {showBackButton && (
                <Tooltip title="Go back">
                  <IconButton
                    onClick={handleBack}
                    sx={{ position: "absolute", top: 16, left: 16 }}
                  >
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
              )}

              {showBranding && (
                <Box sx={{ textAlign: "center", mb: 3 }}>
                  <Logo size={isMobile ? 60 : 80} darkMode={isDarkMode} withText={!isMobile} />
                  {!isMobile && (
                    <Typography variant="h5" color="text.secondary" sx={{ mt: 1 }}>
                      Authentication
                    </Typography>
                  )}
                </Box>
              )}

              {/* Top-right controls */}
              <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 16, right: 16 }}>
                {showLanguageSelector && (
                  <Tooltip title="Select language">
                    <IconButton size="small" onClick={() => setShowSecurityAlert(true)}>
                      <Language />
                    </IconButton>
                  </Tooltip>
                )}

                {showThemeToggle && (
                  <Tooltip title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}>
                    <IconButton size="small" onClick={handleToggleDarkMode}>
                      {isDarkMode ? <Brightness7 /> : <Brightness4 />}
                    </IconButton>
                  </Tooltip>
                )}

                {showHelp && (
                  <Tooltip title="Security information">
                    <IconButton size="small" onClick={() => setShowSecurityInfoVisible(!securityInfoVisible)}>
                      <Info />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>

            {/* Security alert */}
            {showSecurityAlert && (
              <Slide direction="down" in={showSecurityAlert}>
                <Alert
                  severity="info"
                  onClose={() => setShowSecurityAlert(false)}
                  sx={{ mb: 3 }}
                  icon={<Shield />}
                >
                  <Typography variant="body2">
                    Your authentication data is encrypted and secured with enterprise-grade protection.
                  </Typography>
                </Alert>
              </Slide>
            )}

            {/* Security features */}
            {securityInfoVisible && (
              <Fade in={securityInfoVisible}>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={1} justifyContent="center">
                    {securityFeatures.map((feature, index) => (
                      <Grid item key={index}>
                        <Tooltip title={feature.text}>
                          <Chip
                            icon={feature.icon}
                            size="small"
                            color={feature.color}
                            variant="outlined"
                          />
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Fade>
            )}

            {/* Main content */}
            <Box sx={{ mt: 2 }}>
              {children}
            </Box>

            {/* Footer */}
            <Box sx={{ mt: 4 }}>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Need help?
                    </Typography>
                    <Typography
                      variant="caption"
                      component="a"
                      href="/help"
                      color="primary"
                      sx={{ textDecoration: "none", cursor: "pointer" }}
                    >
                      Contact Support
                    </Typography>
                  </Stack>
                </Grid>
                
                <Grid item xs={12} sm={6} sx={{ textAlign: { xs: "left", sm: "right" } }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {showTermsLink && (
                      <>
                        <Typography
                          variant="caption"
                          component="a"
                          href="/terms"
                          target="_blank"
                          color="text.secondary"
                          sx={{ textDecoration: "none", cursor: "pointer" }}
                        >
                          Terms
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography
                          variant="caption"
                          component="a"
                          href="/privacy"
                          target="_blank"
                          color="text.secondary"
                          sx={{ textDecoration: "none", cursor: "pointer" }}
                        >
                          Privacy
                        </Typography>
                      </>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            {/* QR Code Authentication */}
            {showQrCode && (
              <Fade in={showQrCode}>
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    p: 3,
                    zIndex: 10,
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Scan with Mobile App
                  </Typography>
                  <Box
                    sx={{
                      width: 200,
                      height: 200,
                      bgcolor: "grey.100",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 2,
                      mb: 2,
                    }}
                  >
                    <QrCode2 sx={{ fontSize: 100, color: "grey.400" }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" align="center">
                    Open Assessly mobile app and scan this code for quick login
                  </Typography>
                  <Button
                    variant="text"
                    onClick={() => setShowQrCode(false)}
                    sx={{ mt: 2 }}
                  >
                    Back to Login
                  </Button>
                </Box>
              </Fade>
            )}
          </Paper>

          {/* Mobile-only security notice */}
          {isMobile && (
            <Alert
              severity="info"
              sx={{ mt: 2 }}
              icon={<Security />}
            >
              <Typography variant="caption">
                Secure authentication in progress. Your data is protected.
              </Typography>
            </Alert>
          )}
        </MotionDiv>
      </Suspense>
    </Box>
  );

  if (fullScreen) {
    return (
      <Box sx={getBackgroundStyle()}>
        {renderAuthForm()}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        ...getBackgroundStyle(),
      }}
    >
      <Grid container>
        {/* Left panel - Only on large screens */}
        <Grid item xs={12} lg={6}>
          {renderLeftPanel()}
        </Grid>

        {/* Right panel - Auth form */}
        <Grid 
          item 
          xs={12} 
          lg={6}
          sx={{
            bgcolor: "background.paper",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {renderAuthForm()}
        </Grid>
      </Grid>

      {/* Language selector dialog */}
      {showLanguageSelector && (
        <Dialog
          open={showSecurityAlert}
          onClose={() => setShowSecurityAlert(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Select Language</DialogTitle>
          <DialogContent>
            <List>
              {languages.map((lang) => (
                <ListItem
                  key={lang.code}
                  button
                  selected={language === lang.code}
                  onClick={() => {
                    handleLanguageChange(lang.code);
                    setShowSecurityAlert(false);
                  }}
                >
                  <ListItemText
                    primary={`${lang.flag} ${lang.name}`}
                    secondary={lang.code === language ? "Current" : ""}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  darkMode: PropTypes.bool,
  showBranding: PropTypes.bool,
  showBackButton: PropTypes.bool,
  showLanguageSelector: PropTypes.bool,
  showThemeToggle: PropTypes.bool,
  showSecurityInfo: PropTypes.bool,
  showTermsLink: PropTypes.bool,
  showHelp: PropTypes.bool,
  maxWidth: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  centered: PropTypes.bool,
  fullScreen: PropTypes.bool,
  background: PropTypes.oneOf(["gradient", "gradient-dark", "pattern", "solid"]),
  onBack: PropTypes.func,
};

AuthLayout.defaultProps = {
  darkMode: false,
  showBranding: true,
  showBackButton: false,
  showLanguageSelector: false,
  showThemeToggle: true,
  showSecurityInfo: true,
  showTermsLink: true,
  showHelp: true,
  maxWidth: "md",
  centered: true,
  fullScreen: false,
  background: "gradient",
  onBack: null,
};

export default AuthLayout;
