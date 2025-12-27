// src/components/billing/PricingCards.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Check as CheckIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Workspaces as TeamIcon,
} from "@mui/icons-material";
import { fetchSubscriptionPlans, createCheckoutSession } from "../../api/subscriptionApi";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

function PricingCards({ 
  organizationId,
  currentPlanId = null,
  showTrialBadge = true,
  onPlanSelect,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await fetchSubscriptionPlans(organizationId);
      setPlans(data.data || data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error("Failed to load subscription plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    if (onPlanSelect) {
      onPlanSelect(plan);
      return;
    }

    try {
      setProcessing(true);
      setSelectedPlan(plan.id);

      const session = await createCheckoutSession({
        planId: plan.id,
        organizationId,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      if (session.url) {
        window.location.href = session.url;
      }
    } catch (err) {
      enqueueSnackbar(`Failed to start checkout: ${err.message}`, { variant: "error" });
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const getPlanIcon = (planType) => {
    switch (planType?.toLowerCase()) {
      case "enterprise":
        return <BusinessIcon />;
      case "team":
        return <TeamIcon />;
      case "pro":
        return <StarIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getPlanColor = (planType) => {
    switch (planType?.toLowerCase()) {
      case "enterprise":
        return "error";
      case "team":
        return "warning";
      case "pro":
        return "primary";
      default:
        return "info";
    }
  };

  const formatPrice = (amount, interval) => {
    if (amount === 0) return "Free";
    
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100); // Assuming amount in cents

    return `${price}${interval ? `/${interval}` : ""}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ my: 2 }}
        action={
          <Button size="small" onClick={loadPlans}>
            Retry
          </Button>
        }
      >
        Failed to load pricing plans: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      <Box textAlign="center" sx={{ mb: 6 }}>
        <Typography variant="h3" gutterBottom>
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Select the perfect plan for your assessment needs
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const isPopular = plan.isPopular || plan.featured;
          const planColor = getPlanColor(plan.name);

          return (
            <Grid item key={plan.id} xs={12} md={4}>
              <Paper
                elevation={isPopular ? 6 : 2}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: 4,
                  border: isPopular ? 2 : 0,
                  borderColor: `${planColor}.main`,
                  position: "relative",
                  transition: "transform 0.3s, box-shadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 8,
                  },
                }}
              >
                {isPopular && (
                  <Chip
                    label="Most Popular"
                    color={planColor}
                    icon={<TrendingUpIcon />}
                    sx={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                )}

                {isCurrentPlan && (
                  <Chip
                    label="Current Plan"
                    color="success"
                    variant="outlined"
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1, p: 4 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    {getPlanIcon(plan.name)}
                    <Typography variant="h5" sx={{ ml: 1, fontWeight: 600 }}>
                      {plan.name}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h3" color="primary" sx={{ fontWeight: 700 }}>
                      {formatPrice(plan.price, plan.interval)}
                    </Typography>
                    {plan.trialDays && showTrialBadge && (
                      <Chip
                        label={`${plan.trialDays}-day free trial`}
                        color="success"
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>

                  <Typography variant="body1" sx={{ mb: 3, minHeight: 48 }}>
                    {plan.description}
                  </Typography>

                  <List dense sx={{ mb: 3 }}>
                    {(plan.features || []).map((feature, idx) => (
                      <ListItem key={idx} disableGutters sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>

                  <Box sx={{ mt: "auto" }}>
                    <Button
                      variant={isCurrentPlan ? "outlined" : "contained"}
                      color={planColor}
                      fullWidth
                      size="large"
                      onClick={() => handleSelectPlan(plan)}
                      disabled={processing && selectedPlan === plan.id}
                      startIcon={
                        processing && selectedPlan === plan.id ? (
                          <CircularProgress size={20} />
                        ) : isCurrentPlan ? (
                          <CheckIcon />
                        ) : null
                      }
                    >
                      {isCurrentPlan
                        ? "Current Plan"
                        : plan.price === 0
                        ? "Get Started Free"
                        : processing && selectedPlan === plan.id
                        ? "Processing..."
                        : "Choose Plan"}
                    </Button>

                    {plan.usageLimits && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        Includes: {plan.usageLimits.assessments} assessments,{" "}
                        {plan.usageLimits.candidates} candidates
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ mt: 6, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          All plans include our core assessment features. Cancel anytime.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Need a custom plan?{" "}
          <Button
            variant="text"
            size="small"
            onClick={() => navigate("/contact")}
            sx={{ textTransform: "none" }}
          >
            Contact our sales team
          </Button>
        </Typography>
      </Box>
    </Box>
  );
}

PricingCards.propTypes = {
  organizationId: PropTypes.string,
  currentPlanId: PropTypes.string,
  showTrialBadge: PropTypes.bool,
  onPlanSelect: PropTypes.func,
};

PricingCards.defaultProps = {
  showTrialBadge: true,
};

export default React.memo(PricingCards);
