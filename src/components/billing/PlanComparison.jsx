// src/components/billing/PlanComparison.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Switch,
  FormControlLabel,
  Badge,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Star as StarIcon,
  Business as BusinessIcon,
  Diamond as DiamondIcon,
  ArrowUpward,
  ArrowDownward,
  Download,
  CompareArrows,
  Warning,
  TrendingUp,
} from '@mui/icons-material';
import pricingApi from '../../api/pricingApi';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { formatCurrency } from '../../utils/formatters';

/**
 * Plan Comparison Component
 * Detailed comparison of pricing plans with feature matrix and upgrade recommendations
 */

// Feature Row Component
const FeatureRow = React.memo(({ feature, plans, currentPlanId, showIcons = true }) => {
  const theme = useTheme();
  
  return (
    <TableRow 
      hover
      sx={{
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.02),
        },
      }}
    >
      <TableCell 
        component="th" 
        scope="row" 
        sx={{ 
          borderRight: `1px solid ${theme.palette.divider}`,
          position: 'sticky',
          left: 0,
          backgroundColor: theme.palette.background.paper,
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={500}>
            {feature.name}
          </Typography>
          {feature.description && (
            <Tooltip title={feature.description}>
              <InfoIcon fontSize="small" color="action" />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      
      {plans.map((plan) => (
        <TableCell 
          key={plan.id} 
          align="center"
          sx={{
            backgroundColor: currentPlanId === plan.id ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
            borderLeft: currentPlanId === plan.id ? `2px solid ${theme.palette.primary.main}` : 'none',
          }}
        >
          {feature.type === 'boolean' ? (
            plan.features[feature.key] ? (
              <CheckIcon color="success" fontSize="small" />
            ) : (
              <CloseIcon color="disabled" fontSize="small" />
            )
          ) : feature.type === 'numeric' ? (
            <Typography variant="body2" fontWeight={plan.features[feature.key] ? 600 : 400}>
              {plan.features[feature.key] || '—'}
            </Typography>
          ) : feature.type === 'text' ? (
            <Typography variant="caption" color="text.secondary">
              {plan.features[feature.key] || 'Not included'}
            </Typography>
          ) : (
            <Typography variant="body2">
              {plan.features[feature.key] || '—'}
            </Typography>
          )}
        </TableCell>
      ))}
    </TableRow>
  );
});

FeatureRow.displayName = 'FeatureRow';

// Plan Header Component
const PlanHeader = React.memo(({ plan, billingCycle, isCurrent, isPopular }) => {
  const theme = useTheme();
  
  const getPlanIcon = () => {
    switch (plan.id) {
      case 'basic': return <StarIcon />;
      case 'professional': return <BusinessIcon />;
      case 'enterprise': return <DiamondIcon />;
      default: return <StarIcon />;
    }
  };
  
  const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const period = billingCycle === 'annual' ? '/year' : '/month';
  const annualSavings = billingCycle === 'annual' ? plan.annualSavings : 0;
  
  return (
    <Box sx={{ textAlign: 'center', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        {getPlanIcon()}
        {isPopular && (
          <Chip
            label="Most Popular"
            color="primary"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Box>
      
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        {plan.name}
      </Typography>
      
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          {formatCurrency(price, 'usd')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {period}
          {annualSavings > 0 && (
            <Typography component="span" variant="caption" color="success.main" sx={{ ml: 1 }}>
              Save {annualSavings}%
            </Typography>
          )}
        </Typography>
      </Box>
      
      {isCurrent && (
        <Chip
          label="Current Plan"
          color="primary"
          variant="outlined"
          size="small"
          sx={{ mt: 1 }}
        />
      )}
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {plan.description}
      </Typography>
    </Box>
  );
});

PlanHeader.displayName = 'PlanHeader';

// Upgrade Recommendation Component
const UpgradeRecommendation = React.memo(({ currentPlan, recommendedPlan, onUpgrade }) => {
  const theme = useTheme();
  
  if (!currentPlan || !recommendedPlan || currentPlan.id === recommendedPlan.id) {
    return null;
  }
  
  const getRecommendationReason = () => {
    const currentLevel = currentPlan.level || 0;
    const recommendedLevel = recommendedPlan.level || 0;
    
    if (recommendedLevel > currentLevel) {
      return "Upgrade to access advanced features and higher limits";
    } else {
      return "Downgrade to save costs on features you don't need";
    }
  };
  
  return (
    <Alert 
      severity="info" 
      icon={<TrendingUp />}
      sx={{ 
        mb: 3,
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {recommendedPlan.level > currentPlan.level ? 'Upgrade Recommendation' : 'Cost Optimization'}
          </Typography>
          <Typography variant="body2">
            {getRecommendationReason()}
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          onClick={() => onUpgrade(recommendedPlan.id)}
          startIcon={recommendedPlan.level > currentPlan.level ? <ArrowUpward /> : <ArrowDownward />}
        >
          {recommendedPlan.level > currentPlan.level ? 'Upgrade Now' : 'Downgrade'}
        </Button>
      </Box>
    </Alert>
  );
});

UpgradeRecommendation.displayName = 'UpgradeRecommendation';

/**
 * Main PlanComparison Component
 */
const PlanComparison = ({ 
  organizationId, 
  currentPlanId, 
  billingCycle = 'monthly',
  showUpgradeRecommendation = true,
  showAnnualToggle = true,
  compact = false,
}) => {
  const theme = useTheme();
  const { showSnackbar, showError } = useSnackbar();
  
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAnnual, setShowAnnual] = useState(billingCycle === 'annual');
  const [recommendedPlan, setRecommendedPlan] = useState(null);

  // Load plans and features
  useEffect(() => {
    const loadComparisonData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await pricingApi.getPlanComparison();
        
        if (response.success) {
          setPlans(response.data.plans);
          setFeatures(response.data.features);
          
          // Determine recommended plan based on usage
          if (organizationId && showUpgradeRecommendation) {
            const usageResponse = await pricingApi.getUsageRecommendation(organizationId);
            if (usageResponse.success && usageResponse.data.recommendedPlan) {
              setRecommendedPlan(usageResponse.data.recommendedPlan);
            }
          }
        } else {
          throw new Error(response.message || 'Failed to load plan comparison');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load plan comparison';
        setError(errorMessage);
        showError(errorMessage);
        console.error('Plan comparison load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComparisonData();
  }, [organizationId, showUpgradeRecommendation, showError]);

  const handleAnnualToggle = useCallback((event) => {
    setShowAnnual(event.target.checked);
  }, []);

  const handleUpgrade = useCallback(async (planId) => {
    try {
      if (!organizationId) {
        showSnackbar('Please select an organization first', 'info');
        return;
      }
      
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;
      
      const response = await pricingApi.createCheckoutSession({
        organizationId,
        priceId: showAnnual ? plan.annualPriceId : plan.monthlyPriceId,
        successUrl: `${window.location.origin}/organizations/${organizationId}/billing?success=true`,
        cancelUrl: `${window.location.origin}/organizations/${organizationId}/billing?canceled=true`,
      });
      
      if (response.success) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.message || 'Failed to create checkout session');
      }
    } catch (error) {
      showError(error.message || 'Failed to process upgrade');
    }
  }, [organizationId, plans, showAnnual, showSnackbar, showError]);

  const handleExportComparison = useCallback(async () => {
    try {
      const response = await pricingApi.exportPlanComparison({
        billingCycle: showAnnual ? 'annual' : 'monthly',
        format: 'pdf',
      });
      
      if (response.success && response.data.url) {
        window.open(response.data.url, '_blank');
        showSnackbar('Plan comparison exported successfully', 'success');
      }
    } catch (error) {
      showError('Failed to export plan comparison');
    }
  }, [showAnnual, showSnackbar, showError]);

  const currentPlan = useMemo(() => 
    plans.find(plan => plan.id === currentPlanId),
    [plans, currentPlanId]
  );

  const popularPlanId = useMemo(() => 
    plans.find(plan => plan.popular)?.id,
    [plans]
  );

  const filteredPlans = useMemo(() => 
    plans.filter(plan => plan.id !== 'custom' && plan.id !== 'enterprise-custom'),
    [plans]
  );

  const groupedFeatures = useMemo(() => {
    const groups = {};
    features.forEach(feature => {
      if (!groups[feature.category]) {
        groups[feature.category] = [];
      }
      groups[feature.category].push(feature);
    });
    return groups;
  }, [features]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="body2">
          Failed to load plan comparison: {error}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header and Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Box>
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Plan Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare features and pricing across all plans
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showAnnualToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={showAnnual}
                  onChange={handleAnnualToggle}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    Annual Billing
                  </Typography>
                  {showAnnual && (
                    <Chip
                      label="Save up to 20%"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              }
            />
          )}
          
          <Tooltip title="Export comparison">
            <IconButton onClick={handleExportComparison} size="small">
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Upgrade Recommendation */}
      {showUpgradeRecommendation && currentPlan && recommendedPlan && (
        <UpgradeRecommendation
          currentPlan={currentPlan}
          recommendedPlan={recommendedPlan}
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Plan Headers */}
      {!compact && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {filteredPlans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card 
                elevation={plan.id === popularPlanId ? 4 : 1}
                sx={{
                  height: '100%',
                  border: plan.id === currentPlanId ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    boxShadow: theme.shadows[4],
                  },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <PlanHeader
                    plan={plan}
                    billingCycle={showAnnual ? 'annual' : 'monthly'}
                    isCurrent={plan.id === currentPlanId}
                    isPopular={plan.id === popularPlanId}
                  />
                  
                  <Button
                    variant={plan.id === currentPlanId ? 'outlined' : 'contained'}
                    color={plan.id === popularPlanId ? 'primary' : 'inherit'}
                    fullWidth
                    size="small"
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={plan.id === currentPlanId || !organizationId}
                    sx={{ mt: 2 }}
                  >
                    {plan.id === currentPlanId ? 'Current Plan' : 'Select Plan'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Feature Comparison Table */}
      <Paper 
        elevation={0} 
        sx={{ 
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <TableContainer sx={{ maxHeight: compact ? 400 : 600 }}>
          <Table stickyHeader size={compact ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell 
                  sx={{ 
                    borderRight: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600}>
                    Features
                  </Typography>
                </TableCell>
                
                {filteredPlans.map((plan) => (
                  <TableCell 
                    key={plan.id}
                    align="center"
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      borderLeft: plan.id === currentPlanId ? `2px solid ${theme.palette.primary.main}` : 'none',
                      minWidth: 150,
                    }}
                  >
                    <PlanHeader
                      plan={plan}
                      billingCycle={showAnnual ? 'annual' : 'monthly'}
                      isCurrent={plan.id === currentPlanId}
                      isPopular={plan.id === popularPlanId}
                    />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            
            <TableBody>
              {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                <React.Fragment key={category}>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                    <TableCell 
                      colSpan={filteredPlans.length + 1}
                      sx={{ 
                        borderRight: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        {category}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  
                  {categoryFeatures.map((feature) => (
                    <FeatureRow
                      key={feature.key}
                      feature={feature}
                      plans={filteredPlans}
                      currentPlanId={currentPlanId}
                    />
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Footer Notes */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          * All prices are in USD. Taxes may apply based on your location.
          {' '}
          <Button 
            component="a" 
            href="/contact" 
            size="small" 
            sx={{ textTransform: 'none' }}
          >
            Contact sales for custom enterprise plans
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};

PlanComparison.propTypes = {
  /** Organization ID for context-aware recommendations */
  organizationId: PropTypes.string,
  /** Current plan ID to highlight */
  currentPlanId: PropTypes.string,
  /** Default billing cycle */
  billingCycle: PropTypes.oneOf(['monthly', 'annual']),
  /** Show upgrade recommendations */
  showUpgradeRecommendation: PropTypes.bool,
  /** Show annual billing toggle */
  showAnnualToggle: PropTypes.bool,
  /** Compact mode for dashboard widgets */
  compact: PropTypes.bool,
};

PlanComparison.defaultProps = {
  organizationId: null,
  currentPlanId: null,
  billingCycle: 'monthly',
  showUpgradeRecommendation: true,
  showAnnualToggle: true,
  compact: false,
};

export default PlanComparison;
