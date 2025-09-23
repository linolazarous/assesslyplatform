import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  CircularProgress,
  Box,
  Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$50/month',
    features: [
      'Up to 100 assessments/month',
      'Basic question types',
      'PDF reports',
      'Email support'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_BASIC_PRICE_ID
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$100/month',
    features: [
      'Up to 500 assessments/month',
      'Advanced question types',
      'AI Scoring',
      'Offline Sync',
      'Priority support'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom Pricing',
    features: [
      'Unlimited assessments',
      'All advanced features',
      'White-labeling',
      'Dedicated account manager',
      'API access'
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID
  }
];

export default function PricingCards({ orgId, currentPlan }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleSubscribe = async (planId, priceId) => {
    if (!orgId) {
      enqueueSnackbar('Organization ID is missing', { variant: 'error' });
      return;
    }

    setLoadingPlan(planId);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orgId,
          priceId,
          successUrl: `${window.location.origin}/organization/${orgId}/billing?success=true`,
          cancelUrl: `${window.location.origin}/organization/${orgId}/billing`
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate subscription');
      }
      
      window.location.assign(data.url);
    } catch (error) {
      console.error('Subscription error:', error);
      enqueueSnackbar(error.message || 'Failed to initiate subscription', { 
        variant: 'error',
        autoHideDuration: 5000 
      });
      setLoadingPlan(null);
    }
  };

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
      gap: 4,
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {PLANS.map(plan => {
        const isCurrentPlan = currentPlan?.toLowerCase() === plan.id;
        const isLoading = loadingPlan === plan.id;
        
        return (
          <Card 
            key={plan.id}
            elevation={isCurrentPlan ? 3 : 1}
            sx={{
              border: isCurrentPlan ? '2px solid' : '1px solid',
              borderColor: isCurrentPlan ? 'primary.main' : 'divider',
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 4
              },
              position: 'relative'
            }}
          >
            {isCurrentPlan && (
              <Chip
                label="Current Plan"
                color="primary"
                sx={{ 
                  position: 'absolute', 
                  top: 16, 
                  right: 16,
                  fontWeight: 'bold'
                }}
              />
            )}
            
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {plan.name}
              </Typography>
              <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                {plan.price}
              </Typography>
              
              <List dense sx={{ mb: 2 }}>
                {plan.features.map((feature, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon color="primary" fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="body1">{feature}</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
            
            <Box sx={{ p: 3, pt: 0 }}>
              <Button
                fullWidth
                size="large"
                variant={isCurrentPlan ? 'contained' : 'outlined'}
                color={isCurrentPlan ? 'success' : 'primary'}
                disabled={isCurrentPlan || !!loadingPlan || !plan.stripePriceId}
                onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                sx={{ py: 1.5 }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : plan.id === 'enterprise' ? (
                  'Contact Sales'
                ) : (
                  'Get Started'
                )}
              </Button>
            </Box>
          </Card>
        );
      })}
    </Box>
  );
}

PricingCards.propTypes = {
  orgId: PropTypes.string.isRequired,
  currentPlan: PropTypes.string
};
