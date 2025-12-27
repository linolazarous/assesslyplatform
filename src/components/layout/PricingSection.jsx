// src/components/layout/PricingSection.jsx
import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Alert,
  Stack,
  Fade,
  Slide,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  Diamond as DiamondIcon,
  Api as ApiIcon,
  Support as SupportIcon,
  Shield as ShieldIcon,
  WorkspacePremium as WorkspacePremiumIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  EmojiEvents as EmojiEventsIcon,
  Verified as VerifiedIcon,
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

  const [billingCycle, setBillingCycle] = useState('yearly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);

  // Plan templates memoized
  const planTemplates = useMemo(() => ({
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
        customBranding: false,
        apiAccess: false,
      },
      ctaText: 'Get Started Free',
      ctaVariant: 'outlined',
      highlightColor: theme.palette.primary.main,
      badge: 'Starter'
    },
    starter: {
      name: 'Starter',
      description: 'For growing teams needing more assessments and features',
      price: { monthly: 29, yearly: 290 },
      color: theme.palette.success.light,
      icon: <SchoolIcon />,
      gradient: `linear-gradient(135deg, ${alpha(theme.palette.success.light, 0.2)}, ${alpha(theme.palette.success.main, 0.1)})`,
      features: {
        maxUsers: 25,
        maxAssessments: 100,
        maxStorage: 1000,
        customBranding: true,
        apiAccess: false,
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
      price: { monthly: 99, yearly: 950 },
      color: theme.palette.info.light,
      icon: <BusinessIcon />,
      gradient: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.2)}, ${alpha(theme.palette.info.main, 0.1)})`,
      features: {
        maxUsers: 100,
        maxAssessments: 500,
        maxStorage: 5000,
        customBranding: true,
        apiAccess: true,
      },
      ctaText: 'Get Professional',
      ctaVariant: 'contained',
      highlightColor: theme.palette.info.main,
      badge: 'Recommended'
    },
    enterprise: {
      name: 'Enterprise',
      description: 'For large organizations with custom requirements and compliance needs',
      price: { monthly: 299, yearly: 2990 },
      color: theme.palette.warning.light,
      icon: <EmojiEventsIcon />,
      gradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.light, 0.2)}, ${alpha(theme.palette.warning.main, 0.1)})`,
      features: {
        maxUsers: 1000,
        maxAssessments: 5000,
        maxStorage: 50000,
        customBranding: true,
        apiAccess: true,
      },
      ctaText: 'Contact Enterprise',
      ctaVariant: 'contained',
      highlightColor: theme.palette.warning.main,
      custom: true,
      badge: 'Enterprise'
    }
  }), [theme.palette]);

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

  const renderFeatureIcon = useCallback((available) => (
    <ListItemIcon sx={{ minWidth: 36 }}>
      {available ? (
        <CheckIcon sx={{ color: theme.palette.success.main }} />
      ) : (
        <CloseIcon color="disabled" />
      )}
    </ListItemIcon>
  ), [theme]);

  const renderPlanCard = useCallback((planKey) => {
    const plan = planTemplates[planKey];
    const price = plan.price[billingCycle];
    const isCurrent = isCurrentPlan(planKey);

    return (
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onMouseEnter={() => setHoveredPlan(planKey)}
        onMouseLeave={() => setHoveredPlan(null)}
      >
        <Card
          sx={{
            display: 'flex',
            flexDirection: 'column',
            border: isCurrent ? `2px solid ${alpha(theme.palette.primary.main, 0.8)}` : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: 4,
            background: plan.gradient,
            boxShadow: hoveredPlan === planKey ? `0 16px 32px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(plan.color, 0.2), display: 'flex', justifyContent: 'center' }}>
                {plan.icon}
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={800}>{plan.name}</Typography>
                <Typography variant="body2" color="text.secondary">{plan.description}</Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h2" fontWeight={900}>${price}</Typography>
              <Typography variant="body2" color="text.secondary">/{billingCycle === 'yearly' ? 'year' : 'month'}</Typography>
            </Box>

            <List dense>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(true)}
                <ListItemText primary={`${plan.features.maxUsers} users`} secondary="Max team members" />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(true)}
                <ListItemText primary={`${plan.features.maxAssessments} assessments`} secondary="Active assessments" />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(plan.features.customBranding)}
                <ListItemText primary="Custom branding" secondary={plan.features.customBranding ? "Included" : "Not included"} />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                {renderFeatureIcon(plan.features.apiAccess)}
                <ListItemText primary="API Access" secondary={plan.features.apiAccess ? "Included" : "Not included"} />
              </ListItem>
            </List>
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
            >
              {isCurrent ? (plan.custom ? 'Contact for Changes' : '✓ Current Plan') : plan.ctaText}
            </Button>
          </CardActions>
        </Card>
      </motion.div>
    );
  }, [billingCycle, hoveredPlan, isCurrentPlan, planTemplates, renderFeatureIcon, theme, handlePlanSelect, isLoading]);

  return (
    <Box component="section" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight={900}>Choose Your Plan</Typography>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Button
              variant={billingCycle === 'monthly' ? 'contained' : 'outlined'}
              onClick={() => setBillingCycle('monthly')}
              aria-label="Select monthly billing"
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'contained' : 'outlined'}
              onClick={() => setBillingCycle('yearly')}
              aria-label="Select yearly billing"
            >
              Yearly
            </Button>
          </Stack>

          <FormControlLabel
            control={<Switch checked={comparisonMode} onChange={(e) => setComparisonMode(e.target.checked)} />}
            label="Detailed Feature Comparison"
            sx={{ mt: 3 }}
          />
        </Box>

        {currentSubscription && (
          <Alert severity="info" sx={{ mb: 4 }}>
            Your current plan: <strong>{currentSubscription.planName}</strong>
          </Alert>
        )}

        {comparisonMode ? (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Feature</th>
                  {Object.keys(planTemplates).map(planKey => (
                    <th key={planKey} style={{ textAlign: 'center', padding: 8 }}>{planTemplates[planKey].name}</th>
                  ))}
                </tr>
              </thead>
            </table>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {Object.keys(planTemplates).map((planKey) => (
              <Grid item xs={12} md={6} lg={3} key={planKey}>
                {renderPlanCard(planKey)}
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
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
