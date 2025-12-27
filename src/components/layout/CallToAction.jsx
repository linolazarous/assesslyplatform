// src/components/layout/CallToAction.jsx
import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  useTheme,
  Fade,
  Zoom,
  alpha,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  ArrowForward,
  Rocket,
  Security,
  Support,
  Star,
  Close,
  Business,
  AdminPanelSettings,
  Groups,
  TrendingUp,
  IntegrationInstructions,
  WorkspacePremium,
  Lock,
  Cloud,
  VerifiedUser,
  Calculate,
  Timeline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext';

// ---------------------------
// Constants & Benefits List
// ---------------------------
const ENTERPRISE_BENEFITS = [
  {
    icon: Business,
    title: 'Multitenant Architecture',
    description: 'Each organization gets isolated data with shared infrastructure. Perfect for scaling.',
    badge: 'Platform Core',
    color: 'primary',
  },
  {
    icon: Security,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant, end-to-end encryption, GDPR & HIPAA ready. Your data is protected.',
    badge: 'Compliance',
    color: 'success',
  },
  {
    icon: Groups,
    title: 'Centralized Management',
    description: 'Super admin manages all organizations and subscriptions from a single dashboard.',
    badge: 'Admin Control',
    color: 'warning',
  },
  {
    icon: TrendingUp,
    title: 'Proven Scalability',
    description: 'Handles 500+ organizations and millions of assessments with 99.9% uptime.',
    badge: 'Reliability',
    color: 'info',
  },
  {
    icon: IntegrationInstructions,
    title: 'API First Design',
    description: 'RESTful API with webhooks. Integrate with your existing HR, LMS, and CRM systems.',
    badge: 'Integration',
    color: 'secondary',
  },
  {
    icon: WorkspacePremium,
    title: 'White-label Options',
    description: 'Custom branding and domain for each organization. Maintain your brand identity.',
    badge: 'Customization',
    color: 'error',
  },
];

const PLAN_COMPARISON = {
  free: { assessments: 10, users: 5, storage: '1GB', support: 'Community' },
  business: { assessments: 500, users: 50, storage: '10GB', support: 'Priority' },
  enterprise: { assessments: 'Unlimited', users: 'Unlimited', storage: '100GB+', support: '24/7 Dedicated' },
};

// ---------------------------
// BenefitCard Component
// ---------------------------
const BenefitCard = memo(({ benefit, index, showSuperAdmin = false }) => {
  const theme = useTheme();
  const { isSuperAdmin } = useAuth();

  return (
    <Zoom
      in
      timeout={600}
      style={{ transitionDelay: `${800 + index * 100}ms` }}
    >
      <Card
        elevation={3}
        sx={{
          textAlign: 'center',
          height: '100%',
          bgcolor: 'background.paper',
          border: `2px solid ${alpha(theme.palette[benefit.color].main, 0.1)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-8px)',
            borderColor: alpha(theme.palette[benefit.color].main, 0.3),
            bgcolor: alpha(theme.palette[benefit.color].light, 0.05),
            boxShadow: `0 20px 40px ${alpha(theme.palette[benefit.color].main, 0.15)}`,
          },
        }}
      >
        {/* Badge */}
        <Chip
          label={benefit.badge}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            bgcolor: theme.palette[benefit.color].main,
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.7rem',
          }}
        />
        
        {/* Super Admin Note */}
        {showSuperAdmin && isSuperAdmin && benefit.title === 'Centralized Management' && (
          <Alert 
            severity="info" 
            icon={<AdminPanelSettings />}
            sx={{ 
              mt: 1, 
              mx: 2, 
              py: 0.5,
              fontSize: '0.75rem',
              '& .MuiAlert-message': { py: 0.5 }
            }}
          >
            You manage all subscriptions here
          </Alert>
        )}

        <CardContent sx={{ p: 3, pt: 5 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 70,
              height: 70,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette[benefit.color].main, 0.1),
              color: theme.palette[benefit.color].main,
              mb: 3,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.1)',
                bgcolor: alpha(theme.palette[benefit.color].main, 0.2),
              },
            }}
          >
            <benefit.icon sx={{ fontSize: 32 }} aria-hidden="true" />
          </Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {benefit.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {benefit.description}
          </Typography>
        </CardContent>
      </Card>
    </Zoom>
  );
});

BenefitCard.propTypes = {
  benefit: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  showSuperAdmin: PropTypes.bool,
};

// ---------------------------
// PlanComparisonDialog Component
// ---------------------------
const PlanComparisonDialog = memo(({ open, onClose }) => {
  const theme = useTheme();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight="bold">
          Plan Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose the perfect plan for your organization
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {Object.entries(PLAN_COMPARISON).map(([plan, features]) => (
            <Grid item xs={12} md={4} key={plan}>
              <Card sx={{ 
                height: '100%',
                border: `2px solid ${alpha(theme.palette.primary.main, plan === 'enterprise' ? 0.5 : 0.1)}`,
                bgcolor: plan === 'enterprise' ? alpha(theme.palette.primary.light, 0.05) : 'background.paper',
              }}>
                <CardContent>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    color={plan === 'enterprise' ? 'primary' : 'text.primary'}
                    gutterBottom
                  >
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </Typography>
                  
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Assessments
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {features.assessments}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Users
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {features.users}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Storage
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {features.storage}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Support
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {features.support}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.location.href = '/pricing'}
        >
          View Pricing
        </Button>
      </DialogActions>
    </Dialog>
  );
});

PlanComparisonDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ---------------------------
// Main CallToAction Component
// ---------------------------
export default function CallToAction({ 
  showPromo = true,
  showSuperAdminView = false,
  showStats = true,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  
  const [showPromoBanner, setShowPromoBanner] = useState(showPromo);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [activeMetric, setActiveMetric] = useState(0);

  const metrics = useMemo(() => [
    { value: '500+', label: 'Organizations', icon: <Business /> },
    { value: '99.9%', label: 'Uptime SLA', icon: <Timeline /> },
    { value: '1M+', label: 'Monthly Assessments', icon: <Calculate /> },
    { value: 'SOC 2', label: 'Compliance', icon: <VerifiedUser /> },
  ], []);

  const handleCTAClick = useCallback(
    (action) => {
      switch (action) {
        case 'trial':
          navigate('/register');
          break;
        case 'demo':
          navigate('/demo');
          break;
        case 'contact':
          navigate('/contact');
          break;
        case 'pricing':
          navigate('/pricing');
          break;
        default:
          navigate('/register');
      }
    },
    [navigate]
  );

  const handleClosePromo = useCallback(() => setShowPromoBanner(false), []);
  const handleOpenPlanDialog = useCallback(() => setShowPlanDialog(true), []);
  const handleClosePlanDialog = useCallback(() => setShowPlanDialog(false), []);

  // Auto-rotate metrics
  React.useEffect(() => {
    if (!showStats) return;
    
    const interval = setInterval(() => {
      setActiveMetric(prev => (prev + 1) % metrics.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [metrics.length, showStats]);

  const gradientBackground = useMemo(() => 
    `linear-gradient(135deg, 
      ${theme.palette.primary.dark} 0%, 
      ${theme.palette.secondary.dark} 50%, 
      ${theme.palette.success.dark} 100%
    )`,
    [theme]
  );

  return (
    <Box
      component="section"
      id="cta-section"
      sx={{
        py: { xs: 10, md: 15 },
        background: gradientBackground,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#fff', 0.08)} 0%, transparent 70%)`,
          animation: 'float 8s ease-in-out infinite',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.light, 0.05)} 0%, transparent 70%)`,
          animation: 'float 10s ease-in-out infinite reverse',
          zIndex: 0,
        }}
      />

      {/* Promo Banner */}
      {showPromoBanner && (
        <Fade in timeout={500}>
          <Box
            sx={{
              position: 'absolute',
              top: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: alpha('#000', 0.3),
              backdropFilter: 'blur(10px)',
              borderRadius: 4,
              px: 4,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              zIndex: 2,
              border: `1px solid ${alpha('#fff', 0.2)}`,
              maxWidth: '90%',
              width: 'fit-content',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Rocket sx={{ fontSize: 24, color: theme.palette.warning.light }} />
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  🎉 Extended Enterprise Trial
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  30-day free trial with all enterprise features included
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Close banner">
              <IconButton
                size="small"
                onClick={handleClosePromo}
                sx={{ color: 'white' }}
                aria-label="Close promo banner"
              >
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Fade>
      )}

      {/* Super Admin Alert */}
      {showSuperAdminView && isSuperAdmin && (
        <Fade in timeout={600}>
          <Alert 
            severity="info" 
            icon={<AdminPanelSettings />}
            sx={{ 
              position: 'absolute',
              top: showPromoBanner ? 100 : 32,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: 800,
              zIndex: 2,
              bgcolor: alpha(theme.palette.info.dark, 0.2),
              color: 'white',
              border: `1px solid ${alpha(theme.palette.info.light, 0.3)}`,
            }}
          >
            <Typography variant="body2">
              <strong>Super Admin View:</strong> You're seeing the public CTA. 
              As platform administrator, you manage all organizations and subscriptions centrally.
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Content */}
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={8} alignItems="center">
          {/* Left - Main CTA */}
          <Grid item xs={12} lg={6}>
            <Fade in timeout={800}>
              <Box sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
                <Chip
                  label="ENTERPRISE READY"
                  color="primary"
                  sx={{ 
                    mb: 3, 
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    py: 1,
                    bgcolor: alpha('#fff', 0.1),
                    color: 'white',
                    border: `1px solid ${alpha('#fff', 0.3)}`,
                  }}
                  icon={<Lock />}
                />
                
                <Typography
                  variant="h1"
                  component="h2"
                  sx={{
                    fontWeight: 900,
                    mb: 3,
                    fontSize: { xs: '2.75rem', md: '4rem', lg: '4.5rem' },
                    lineHeight: 1.1,
                    textShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}
                >
                  Ready to Scale Your{' '}
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(45deg, #fbbf24, #f59e0b, #eab308, #fbbf24)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundSize: '300% 300%',
                      animation: 'gradientShift 6s ease infinite',
                      display: 'inline-block',
                    }}
                  >
                    Assessment Platform?
                  </Box>
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    mb: 5,
                    opacity: 0.95,
                    lineHeight: 1.6,
                    fontSize: { xs: '1.2rem', md: '1.5rem' },
                    maxWidth: 600,
                    mx: { xs: 'auto', lg: 0 },
                    fontWeight: 400,
                  }}
                >
                  Join industry leaders who trust our multitenant platform to deliver 
                  secure, scalable assessment solutions across their entire organization.
                </Typography>

                {/* Live Metrics */}
                {showStats && (
                  <Fade in timeout={1000}>
                    <Box sx={{ mb: 5 }}>
                      <Typography variant="body2" sx={{ mb: 2, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Platform at Scale
                      </Typography>
                      <Grid container spacing={3}>
                        {metrics.map((metric, index) => (
                          <Grid item xs={6} sm={3} key={metric.label}>
                            <Box
                              sx={{
                                textAlign: 'center',
                                p: 2,
                                borderRadius: 2,
                                bgcolor: alpha('#fff', activeMetric === index ? 0.15 : 0.05),
                                border: `1px solid ${alpha('#fff', activeMetric === index ? 0.3 : 0.1)}`,
                                transition: 'all 0.3s ease',
                                transform: activeMetric === index ? 'scale(1.05)' : 'scale(1)',
                              }}
                            >
                              <Box sx={{ 
                                color: activeMetric === index ? theme.palette.warning.light : 'white',
                                opacity: activeMetric === index ? 1 : 0.7,
                              }}>
                                {metric.icon}
                              </Box>
                              <Typography variant="h4" fontWeight={800} sx={{ my: 1 }}>
                                {metric.value}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                {metric.label}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Fade>
                )}

                {/* CTA Buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 3,
                    justifyContent: { xs: 'center', lg: 'flex-start' },
                    flexWrap: 'wrap',
                    mb: 4,
                  }}
                >
                  <Button
                    variant="contained"
                    size="extra-large"
                    onClick={() => handleCTAClick('trial')}
                    endIcon={<ArrowForward />}
                    sx={{
                      px: 6,
                      py: 2,
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      borderRadius: 4,
                      bgcolor: 'white',
                      color: 'primary.dark',
                      minWidth: { xs: '100%', sm: 'auto' },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      '&:hover': {
                        transform: 'translateY(-4px) scale(1.02)',
                        boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
                        bgcolor: 'grey.50',
                      },
                    }}
                  >
                    Start Enterprise Trial
                  </Button>

                  <Stack direction="column" spacing={1}>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleOpenPlanDialog}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: 3,
                        borderColor: 'white',
                        borderWidth: 2,
                        color: 'white',
                        minWidth: { xs: '100%', sm: 'auto' },
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          bgcolor: alpha('#fff', 0.15),
                          borderColor: 'white',
                          boxShadow: '0 8px 24px rgba(255,255,255,0.1)',
                        },
                      }}
                    >
                      Compare Plans
                    </Button>
                    <Button
                      variant="text"
                      size="medium"
                      onClick={() => handleCTAClick('contact')}
                      sx={{
                        color: 'white',
                        opacity: 0.8,
                        '&:hover': {
                          opacity: 1,
                          bgcolor: alpha('#fff', 0.05),
                        },
                      }}
                    >
                      Contact Enterprise Sales →
                    </Button>
                  </Stack>
                </Box>

                {/* Trust Indicators */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'center', lg: 'flex-start' },
                    gap: 3,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedUser sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      SOC 2 Compliant
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Cloud sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      99.9% Uptime SLA
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Support sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      24/7 Support
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Fade>
          </Grid>

          {/* Right - Benefits Grid */}
          <Grid item xs={12} lg={6}>
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{ 
                mb: 4, 
                textAlign: { xs: 'center', lg: 'left' },
                color: 'white',
              }}
            >
              Why Organizations Choose Assessly
            </Typography>
            
            <Grid container spacing={3}>
              {ENTERPRISE_BENEFITS.map((benefit, index) => (
                <Grid item xs={12} sm={6} key={benefit.title}>
                  <BenefitCard 
                    benefit={benefit} 
                    index={index}
                    showSuperAdmin={showSuperAdminView}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Additional Enterprise Note */}
            <Fade in timeout={1400}>
              <Card sx={{ 
                mt: 4,
                bgcolor: alpha('#000', 0.2),
                border: `1px solid ${alpha('#fff', 0.1)}`,
                backdropFilter: 'blur(10px)',
              }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <AdminPanelSettings sx={{ fontSize: 32, color: theme.palette.info.light }} />
                    <Box>
                      <Typography variant="body1" fontWeight="bold" gutterBottom>
                        Super Admin Managed
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        All organizations operate independently while you maintain centralized control 
                        over subscriptions, billing, and platform management.
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        </Grid>
      </Container>

      {/* Plan Comparison Dialog */}
      <PlanComparisonDialog 
        open={showPlanDialog} 
        onClose={handleClosePlanDialog} 
      />

      {/* Global Animations */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

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
}

CallToAction.propTypes = {
  showPromo: PropTypes.bool,
  showSuperAdminView: PropTypes.bool,
  showStats: PropTypes.bool,
};

CallToAction.defaultProps = {
  showPromo: true,
  showSuperAdminView: false,
  showStats: true,
};
