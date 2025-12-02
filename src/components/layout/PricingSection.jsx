// src/components/layout/PricingSection.jsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Grid,
  Container,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Alert,
  Stack,
  Fade,
  Zoom,
  Slide,
  useTheme,
  useMediaQuery,
  alpha,
  Badge,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  Api as ApiIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEvents as EmojiEventsIcon,
  CompareArrows as CompareArrowsIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon,
  Bolt as BoltIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  Verified as VerifiedIcon,
  Diamond as DiamondIcon,
  MonetizationOn as MonetizationOnIcon,
  GroupAdd as GroupAddIcon,
  Cloud as CloudIcon,
  Shield as ShieldIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const PricingSection = ({ 
  organization, 
  currentSubscription, 
  onPlanSelect,
  isAdmin = false,
  isLoading = false 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const [billingCycle, setBillingCycle] = useState('yearly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);

  // Define plan templates with enhanced styling matching HeroSection
  const planTemplates = {
    free: {
      name: 'Free',
      description: 'Perfect for individuals and small teams getting started',
      price: { monthly: 0, yearly: 0 },
      color: theme.palette.primary.light,
      icon: <PersonIcon />,
      gradient: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.2)}, ${alpha(theme.palette.primary.main, 0.1)})`,
      features: {
        maxUsers: 3,
        maxAssessments: 10,
        maxStorage: 100,
        maxResponses: 100,
        questionTypes: ['Multiple Choice', 'Single Choice', 'True/False', 'Short Answer'],
        analytics: 'Basic',
        support: 'Community',
        apiRateLimit: 100,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
        ssoIntegration: false,
        whiteLabeling: false,
        proctoring: false,
        compliance: [],
        security: ['Basic Auth']
      },
      ctaText: 'Get Started Free',
      ctaVariant: 'outlined',
      highlightColor: theme.palette.primary.main,
      badge: 'Starter'
    },
    starter: {
      name: 'Starter',
      description: 'For growing teams needing more assessments and features',
      price: { monthly: 29, yearly: 290 }, // 2 months free
      color: theme.palette.success.light,
      icon: <SchoolIcon />,
      gradient: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.2)}, ${alpha(theme.palette.success.main, 0.1)})`,
      features: {
        maxUsers: 25,
        maxAssessments: 100,
        maxStorage: 1000,
        maxResponses: 1000,
        questionTypes: ['Multiple Choice', 'Single Choice', 'True/False', 'Short Answer', 'Essay'],
        analytics: 'Advanced',
        support: 'Email',
        apiRateLimit: 1000,
        customBranding: true,
        apiAccess: false,
        prioritySupport: false,
        ssoIntegration: false,
        whiteLabeling: false,
        proctoring: 'Basic',
        compliance: ['GDPR Ready'],
        security: ['SSL/TLS', 'Basic Auth']
      },
      ctaText: 'Start 14-Day Trial',
      ctaVariant: 'contained',
      highlightColor: theme.palette.success.main,
      popular: true,
      badge: 'Popular'
    },
    professional: {
      name: 'Professional',
      description: 'For organizations requiring advanced features and integrations',
      price: { monthly: 99, yearly: 950 }, // 2 months free
      color: theme.palette.info.light,
      icon: <BusinessIcon />,
      gradient: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.2)}, ${alpha(theme.palette.info.main, 0.1)})`,
      features: {
        maxUsers: 100,
        maxAssessments: 500,
        maxStorage: 5000,
        maxResponses: 5000,
        questionTypes: ['Multiple Choice', 'Single Choice', 'True/False', 'Short Answer', 'Essay', 'Code'],
        analytics: 'Advanced',
        support: 'Priority',
        apiRateLimit: 5000,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: true,
        whiteLabeling: false,
        proctoring: 'Advanced',
        compliance: ['GDPR', 'SOC2 Type I'],
        security: ['SSL/TLS', 'MFA Optional', 'Audit Logs']
      },
      ctaText: 'Get Professional',
      ctaVariant: 'contained',
      highlightColor: theme.palette.info.main,
      badge: 'Recommended'
    },
    enterprise: {
      name: 'Enterprise',
      description: 'For large organizations with custom requirements and compliance needs',
      price: { monthly: 299, yearly: 2990 }, // Annual only, includes discount
      color: theme.palette.warning.light,
      icon: <EmojiEventsIcon />,
      gradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.2)}, ${alpha(theme.palette.warning.main, 0.1)})`,
      features: {
        maxUsers: 1000,
        maxAssessments: 5000,
        maxStorage: 50000,
        maxResponses: 50000,
        questionTypes: ['All Types', '+ File Upload'],
        analytics: 'Enterprise',
        support: '24/7 Premium',
        apiRateLimit: 50000,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        ssoIntegration: true,
        whiteLabeling: true,
        proctoring: 'AI Monitoring',
        compliance: ['GDPR', 'HIPAA', 'SOC2 Type II'],
        security: ['MFA Enforcement', 'IP Restrictions', 'Advanced Audit Logs']
      },
      ctaText: 'Contact Enterprise',
      ctaVariant: 'contained',
      highlightColor: theme.palette.warning.main,
      custom: true,
      badge: 'Enterprise'
    }
  };

  // Current organization's subscription info
  const currentPlan = currentSubscription?.plan || 'free';
  const isCurrentPlan = (planKey) => planKey === currentPlan;

  const handlePlanSelect = useCallback((planKey) => {
    if (!isAdmin && planKey !== 'free') {
      navigate('/register');
      return;
    }

    setSelectedPlan(planKey);
    
    if (onPlanSelect) {
      const selectedPlanData = planTemplates[planKey];
      onPlanSelect({
        plan: planKey,
        planName: selectedPlanData.name,
        price: {
          amount: selectedPlanData.price[billingCycle],
          currency: 'USD',
          billingPeriod: billingCycle === 'yearly' ? 'yearly' : 'monthly'
        },
        features: selectedPlanData.features
      });
    }
  }, [billingCycle, isAdmin, navigate, onPlanSelect, planTemplates]);

  const handleBillingToggle = useCallback(() => {
    setBillingCycle(prev => prev === 'yearly' ? 'monthly' : 'yearly');
  }, []);

  const renderFeatureIcon = useCallback((available, isHighlight = false) => (
    <ListItemIcon sx={{ minWidth: 36 }}>
      {available ? (
        <CheckIcon sx={{ 
          color: isHighlight ? theme.palette.success.main : theme.palette.success.light,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
        }} />
      ) : (
        <CloseIcon color="disabled" />
      )}
    </ListItemIcon>
  ), [theme]);

  const renderPlanCard = useCallback((planKey) => {
    const plan = planTemplates[planKey];
    const price = plan.price[billingCycle];
    const isCurrent = isCurrentPlan(planKey);
    const annualSavings = planKey !== 'free' && billingCycle === 'yearly' 
      ? Math.round(((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12)) * 100)
      : 0;

    return (
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onMouseEnter={() => setHoveredPlan(planKey)}
        onMouseLeave={() => setHoveredPlan(null)}
      >
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: isCurrent 
              ? `2px solid ${alpha(theme.palette.primary.main, 0.8)}` 
              : plan.popular 
                ? `2px solid ${alpha(theme.palette.success.main, 0.6)}`
                : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: 4,
            overflow: 'visible',
            position: 'relative',
            background: `
              linear-gradient(145deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%,
                ${alpha(theme.palette.background.paper, 0.85)} 100%
              ),
              ${plan.gradient}
            `,
            backdropFilter: 'blur(20px)',
            boxShadow: hoveredPlan === planKey
              ? `0 24px 48px ${alpha(plan.highlightColor, 0.2)}, 0 12px 24px ${alpha(theme.palette.common.black, 0.1)}`
              : plan.popular
                ? `0 16px 32px ${alpha(plan.highlightColor, 0.15)}`
                : `0 8px 24px ${alpha(theme.palette.common.black, 0.08)}`,
            transition: 'all 0.3s ease',
            transform: hoveredPlan === planKey ? 'translateY(-4px)' : 'none',
          }}
        >
          {/* Premium badge */}
          {plan.popular && (
            <Box
              sx={{
                position: 'absolute',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                color: 'white',
                px: 3,
                py: 0.75,
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                boxShadow: `0 8px 16px ${alpha(theme.palette.success.main, 0.3)}`,
                zIndex: 1,
              }}
            >
              <StarIcon sx={{ fontSize: 16 }} />
              {plan.badge}
            </Box>
          )}

          {/* Plan badge (non-popular) */}
          {!plan.popular && plan.badge && (
            <Box
              sx={{
                position: 'absolute',
                top: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                background: alpha(plan.highlightColor, 0.1),
                color: plan.highlightColor,
                px: 2,
                py: 0.5,
                borderRadius: 12,
                fontSize: '0.7rem',
                fontWeight: 600,
                border: `1px solid ${alpha(plan.highlightColor, 0.3)}`,
              }}
            >
              {plan.badge}
            </Box>
          )}

          <CardContent sx={{ flexGrow: 1, pt: plan.popular ? 5 : 3, px: 3 }}>
            {/* Plan header with icon */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${alpha(plan.color, 0.2)} 0%, ${alpha(plan.color, 0.1)} 100%)`,
                  border: `1px solid ${alpha(plan.color, 0.3)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {plan.icon}
              </Box>
              <Box>
                <Typography variant="h4" component="h3" fontWeight={800} gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {plan.description}
                </Typography>
              </Box>
            </Box>

            {/* Price display with animation */}
            <motion.div
              key={`${planKey}-${billingCycle}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h2" component="div" fontWeight={900}>
                    ${price}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" fontWeight={500}>
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </Typography>
                </Box>
                
                {planKey !== 'free' && billingCycle === 'yearly' && annualSavings > 0 && (
                  <Chip
                    label={`Save ${annualSavings}% annually`}
                    color="success"
                    size="small"
                    sx={{ 
                      mt: 1,
                      fontWeight: 600,
                      background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                      color: 'white',
                    }}
                    icon={<TrendingUpIcon />}
                  />
                )}
              </Box>
            </motion.div>

            {/* Feature highlights */}
            <List dense sx={{ mb: 2 }}>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(true, true)}
                <ListItemText 
                  primary={
                    <Typography variant="body1" fontWeight={600}>
                      {plan.features.maxUsers} users
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Maximum team members
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(true, true)}
                <ListItemText 
                  primary={
                    <Typography variant="body1" fontWeight={600}>
                      {plan.features.maxAssessments} assessments
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Active assessments
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(plan.features.customBranding)}
                <ListItemText 
                  primary={
                    <Typography variant="body1" fontWeight={600}>
                      Custom branding
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {plan.features.customBranding ? "Your logo and colors" : "Not included"}
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(plan.features.apiAccess)}
                <ListItemText 
                  primary={
                    <Typography variant="body1" fontWeight={600}>
                      API Access
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {plan.features.apiAccess 
                        ? `${plan.features.apiRateLimit.toLocaleString()} calls/hour`
                        : "Not included"
                      }
                    </Typography>
                  }
                />
              </ListItem>
            </List>

            {/* Security & Compliance badges */}
            {plan.features.compliance && plan.features.compliance.length > 0 && (
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Compliance & Security
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {plan.features.compliance.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.65rem',
                        borderColor: alpha(theme.palette.info.main, 0.3),
                        color: theme.palette.info.main,
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>

          <CardActions sx={{ p: 3, pt: 0 }}>
            <Button
              fullWidth
              variant={isCurrent ? 'outlined' : plan.ctaVariant}
              color={plan.popular ? 'success' : 'primary'}
              size="large"
              onClick={() => handlePlanSelect(planKey)}
              disabled={isLoading || (isCurrent && !plan.custom)}
              startIcon={isCurrent ? null : <ArrowForwardIcon />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '1rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                ...(plan.popular && {
                  background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.3)}`,
                  },
                }),
                ...(!isCurrent && !plan.popular && {
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                }),
              }}
            >
              {isCurrent ? (
                plan.custom ? 'Contact for Changes' : '✓ Current Plan'
              ) : plan.ctaText}
            </Button>
          </CardActions>
        </Card>
      </motion.div>
    );
  }, [billingCycle, hoveredPlan, isCurrentPlan, planTemplates, renderFeatureIcon, theme, handlePlanSelect, isLoading]);

  // Enhanced feature comparison table
  const renderFeatureComparison = useCallback(() => {
    const features = [
      { label: 'Maximum Users', key: 'maxUsers', format: (v) => v.toLocaleString(), icon: <PeopleIcon /> },
      { label: 'Assessments Limit', key: 'maxAssessments', format: (v) => v.toLocaleString(), icon: <AssessmentIcon /> },
      { label: 'Storage (MB)', key: 'maxStorage', format: (v) => v.toLocaleString(), icon: <StorageIcon /> },
      { label: 'Custom Branding', key: 'customBranding', format: (v) => v ? '✓' : '✗', icon: <DiamondIcon /> },
      { label: 'API Access', key: 'apiAccess', format: (v) => v ? '✓' : '✗', icon: <ApiIcon /> },
      { label: 'Priority Support', key: 'prioritySupport', format: (v) => v ? '✓' : '✗', icon: <SupportIcon /> },
      { label: 'SSO Integration', key: 'ssoIntegration', format: (v) => v ? '✓' : '✗', icon: <ShieldIcon /> },
      { label: 'White Labeling', key: 'whiteLabeling', format: (v) => v ? '✓' : '✗', icon: <WorkspacePremiumIcon /> },
      { label: 'Advanced Proctoring', key: 'proctoring', format: (v) => v ? v : 'None', icon: <SecurityIcon /> },
      { label: 'API Rate Limit', key: 'apiRateLimit', format: (v) => v.toLocaleString(), icon: <SpeedIcon /> },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper
          elevation={2}
          sx={{
            overflow: 'auto',
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(20px)',
          }}
        >
          <Box sx={{ minWidth: isMobile ? 800 : 'auto', p: 1 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      background: theme.palette.background.paper,
                      padding: theme.spacing(2),
                      textAlign: 'left',
                      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    }}
                  >
                    <Typography variant="h6" fontWeight={700}>
                      Features
                    </Typography>
                  </th>
                  {Object.keys(planTemplates).map((planKey) => (
                    <th
                      key={planKey}
                      style={{
                        padding: theme.spacing(2),
                        textAlign: 'center',
                        borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      }}
                    >
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {planTemplates[planKey].name}
                        </Typography>
                        {isCurrentPlan(planKey) && (
                          <Chip
                            label="Current"
                            size="small"
                            sx={{
                              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr
                    key={feature.key}
                    style={{
                      backgroundColor: index % 2 === 0 
                        ? alpha(theme.palette.background.default, 0.5)
                        : 'transparent',
                    }}
                  >
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 5,
                        background: index % 2 === 0 
                          ? alpha(theme.palette.background.default, 0.5)
                          : theme.palette.background.paper,
                        padding: theme.spacing(2),
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: theme.palette.primary.main }}>
                          {feature.icon}
                        </Box>
                        <Typography variant="body1" fontWeight={500}>
                          {feature.label}
                        </Typography>
                      </Box>
                    </td>
                    {Object.keys(planTemplates).map((planKey) => (
                      <td
                        key={planKey}
                        style={{
                          padding: theme.spacing(2),
                          textAlign: 'center',
                          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={
                            planTemplates[planKey].features[feature.key] === true
                              ? 'success.main'
                              : planTemplates[planKey].features[feature.key] === false
                              ? 'text.disabled'
                              : 'text.primary'
                          }
                        >
                          {feature.format(planTemplates[planKey].features[feature.key])}
                        </Typography>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      </motion.div>
    );
  }, [isMobile, planTemplates, isCurrentPlan, theme]);

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 8, md: 12 },
        background: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.light, 0.05)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.light, 0.05)} 0%, transparent 50%),
          linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)
        `,
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 0,
          opacity: 0.3,
        }}
      >
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: 100 + i * 50,
              height: 100 + i * 50,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.1)} 0%, transparent 70%)`,
              top: `${20 + i * 15}%`,
              left: `${10 + i * 20}%`,
              animation: `float ${15 + i * 5}s infinite ease-in-out`,
            }}
          />
        ))}
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Fade in timeout={800}>
            <Box>
              <Chip
                label="PRICING PLANS"
                color="primary"
                size="small"
                sx={{
                  mb: 3,
                  fontWeight: 700,
                  letterSpacing: '1px',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  color: 'white',
                  px: 2,
                  py: 1,
                }}
              />
              
              <Typography
                variant="h2"
                fontWeight={900}
                gutterBottom
                sx={{
                  fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                  background: `linear-gradient(45deg, ${theme.palette.text.primary}, ${alpha(theme.palette.text.primary, 0.8)})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Choose Your Plan
              </Typography>
              
              <Typography
                variant="h5"
                color="text.secondary"
                sx={{
                  maxWidth: 800,
                  mx: 'auto',
                  mb: 4,
                  fontWeight: 400,
                  lineHeight: 1.6,
                }}
              >
                Scale from individual assessments to enterprise-wide evaluation platforms.
                All plans include our core assessment features.
              </Typography>

              {/* Billing toggle with animation */}
              <Paper
                component={motion.div}
                layout
                elevation={0}
                sx={{
                  display: 'inline-flex',
                  p: 0.5,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  background: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Button
                  component={motion.button}
                  layout
                  variant={billingCycle === 'monthly' ? 'contained' : 'text'}
                  onClick={handleBillingToggle}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    ...(billingCycle === 'monthly' && {
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                    }),
                  }}
                >
                  Monthly Billing
                </Button>
                <Button
                  component={motion.button}
                  layout
                  variant={billingCycle === 'yearly' ? 'contained' : 'text'}
                  onClick={handleBillingToggle}
                  sx={{
                    borderRadius: 2,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    ...(billingCycle === 'yearly' && {
                      background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                    }),
                  }}
                >
                  Yearly Billing
                  <Chip
                    label="Save 20%"
                    size="small"
                    sx={{
                      ml: 1,
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.2)',
                      color: 'inherit',
                    }}
                  />
                </Button>
              </Paper>

              {/* Comparison mode toggle */}
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={comparisonMode}
                      onChange={(e) => setComparisonMode(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500}>
                      Detailed Feature Comparison
                    </Typography>
                  }
                />
                <Tooltip title="Compare all features side by side">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Fade>
        </Box>

        {/* Current subscription info */}
        <AnimatePresence>
          {currentSubscription && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert 
                severity="info"
                sx={{
                  mb: 4,
                  borderRadius: 2,
                  background: `linear-gradient(45deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.info.light, 0.05)})`,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  backdropFilter: 'blur(10px)',
                }}
                icon={<VerifiedIcon />}
                action={
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={() => navigate('/dashboard/subscription')}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Manage
                  </Button>
                }
              >
                <Typography variant="body2" fontWeight={500}>
                  Your organization is currently on the{' '}
                  <Box component="span" fontWeight={700} color="primary.main">
                    {currentSubscription.planName}
                  </Box>{' '}
                  plan.
                  {currentSubscription.daysRemaining && (
                    <> Renewal in <Box component="span" fontWeight={700}>{currentSubscription.daysRemaining} days</Box>.</>
                  )}
                </Typography>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan cards or comparison table */}
        {comparisonMode ? (
          renderFeatureComparison()
        ) : (
          <Grid container spacing={3} alignItems="stretch">
            {Object.keys(planTemplates).map((planKey, index) => (
              <Grid item xs={12} md={6} lg={3} key={planKey}>
                <Slide
                  direction="up"
                  in
                  timeout={300 + index * 100}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <Box sx={{ height: '100%' }}>
                    {renderPlanCard(planKey)}
                  </Box>
                </Slide>
              </Grid>
            ))}
          </Grid>
        )}

        {/* FAQ/Additional Info */}
        <Fade in timeout={1000}>
          <Box sx={{ mt: 12 }}>
            <Typography
              variant="h3"
              textAlign="center"
              fontWeight={800}
              gutterBottom
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                mb: 6,
              }}
            >
              Frequently Asked Questions
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Paper
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      background: alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        boxShadow: `0 16px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
                      },
                    }}
                  >
                    <SupportIcon 
                      sx={{ 
                        fontSize: 48, 
                        mb: 2,
                        color: theme.palette.primary.main,
                        opacity: 0.8,
                      }} 
                    />
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Support Included
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All paid plans include email support. Professional and Enterprise plans 
                      get priority support with guaranteed response times under 2 hours.
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}>
                  <Paper
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      background: alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.success.main, 0.3),
                        boxShadow: `0 16px 32px ${alpha(theme.palette.success.main, 0.1)}`,
                      },
                    }}
                  >
                    <CompareArrowsIcon 
                      sx={{ 
                        fontSize: 48, 
                        mb: 2,
                        color: theme.palette.success.main,
                        opacity: 0.8,
                      }} 
                    />
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Flexible Upgrades
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Upgrade or downgrade anytime. Changes take effect immediately with 
                      prorated billing. No long-term contracts required.
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}>
                  <Paper
                    sx={{
                      p: 4,
                      height: '100%',
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      background: alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: alpha(theme.palette.warning.main, 0.3),
                        boxShadow: `0 16px 32px ${alpha(theme.palette.warning.main, 0.1)}`,
                      },
                    }}
                  >
                    <ShieldIcon 
                      sx={{ 
                        fontSize: 48, 
                        mb: 2,
                        color: theme.palette.warning.main,
                        opacity: 0.8,
                      }} 
                    />
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      Enterprise Security
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All data is encrypted at rest and in transit. Enterprise plan includes 
                      GDPR, HIPAA, and SOC2 compliance with dedicated security monitoring.
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            </Grid>
          </Box>
        </Fade>

        {/* Enterprise CTA */}
        <Fade in timeout={1200}>
          <Box sx={{ textAlign: 'center', mt: 12 }}>
            <Paper
              sx={{
                p: 6,
                borderRadius: 4,
                background: `linear-gradient(135deg, 
                  ${alpha(theme.palette.primary.dark, 0.1)} 0%,
                  ${alpha(theme.palette.primary.main, 0.05)} 100%
                )`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                backdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: -100,
                  right: -100,
                  width: 300,
                  height: 300,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                  opacity: 0.5,
                }}
              />
              
              <WorkspacePremiumIcon 
                sx={{ 
                  fontSize: 64, 
                  mb: 3,
                  color: theme.palette.primary.main,
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
                }} 
              />
              
              <Typography variant="h3" fontWeight={900} gutterBottom>
                Need a Custom Enterprise Plan?
              </Typography>
              
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                We work with large organizations to create tailored solutions with custom pricing, 
                dedicated support, and specialized compliance requirements.
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/contact')}
                  sx={{
                    px: 6,
                    py: 2,
                    borderRadius: 2,
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 16px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                    },
                  }}
                  endIcon={<ArrowForwardIcon />}
                >
                  Schedule Enterprise Demo
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/enterprise')}
                  sx={{
                    px: 6,
                    py: 2,
                    borderRadius: 2,
                    fontWeight: 700,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  View Enterprise Features
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Fade>
      </Container>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
      `}</style>
    </Box>
  );
};

PricingSection.propTypes = {
  organization: PropTypes.object,
  currentSubscription: PropTypes.object,
  onPlanSelect: PropTypes.func,
  isAdmin: PropTypes.bool,
  isLoading: PropTypes.bool,
};

PricingSection.defaultProps = {
  onPlanSelect: () => {},
  isAdmin: false,
  isLoading: false,
};

export default React.memo(PricingSection);
