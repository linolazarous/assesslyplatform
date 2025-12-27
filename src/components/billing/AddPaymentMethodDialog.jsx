// src/components/billing/AddPaymentMethodDialog.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { addPaymentMethod } from "../../api/subscriptionApi";
import { useSnackbar } from "notistack";

const steps = ['Select Method', 'Enter Details', 'Confirm'];

const PAYMENT_TYPES = [
  { value: 'card', label: 'Credit/Debit Card', icon: <CreditCardIcon /> },
  { value: 'bank_account', label: 'Bank Account', icon: <BankIcon /> },
  { value: 'wallet', label: 'Digital Wallet', icon: <MoneyIcon /> },
];

const CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'MasterCard' },
  { value: 'amex', label: 'American Express' },
  { value: 'discover', label: 'Discover' },
  { value: 'other', label: 'Other' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString().padStart(2, '0'),
  label: (i + 1).toString().padStart(2, '0'),
}));

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() + i;
  return { value: year.toString(), label: year.toString() };
});

function AddPaymentMethodDialog({ open, onClose, customerId, organizationId, onSuccess }) {
  const { enqueueSnackbar } = useSnackbar();
  
  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    type: 'card',
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    brand: '',
    isDefault: false,
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    },
  });

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format as 4242 4242 4242 4242
    if (value.length > 16) value = value.substring(0, 16);
    if (value.length > 0) {
      value = value.match(/.{1,4}/g).join(' ');
    }
    
    // Detect card brand based on first digits
    let brand = '';
    const firstDigit = value.charAt(0);
    if (firstDigit === '4') brand = 'visa';
    else if (firstDigit === '5') brand = 'mastercard';
    else if (firstDigit === '3') brand = 'amex';
    else if (firstDigit === '6') brand = 'discover';
    
    setFormData(prev => ({
      ...prev,
      cardNumber: value,
      brand: brand,
    }));
  };

  const handleSubmit = async () => {
    if (!customerId) {
      setError('Customer ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare payload based on payment type
      let payload = {
        customerId,
        organizationId,
        type: formData.type,
        isDefault: formData.isDefault,
        metadata: {
          addedVia: 'admin_dashboard',
          timestamp: new Date().toISOString(),
        },
      };

      if (formData.type === 'card') {
        payload.card = {
          number: formData.cardNumber.replace(/\s/g, ''),
          exp_month: formData.expiryMonth,
          exp_year: formData.expiryYear,
          cvc: formData.cvc,
          name: formData.cardHolderName,
          brand: formData.brand,
        };
        
        if (formData.billingAddress.line1) {
          payload.billing_details = formData.billingAddress;
        }
      } else if (formData.type === 'bank_account') {
        // For bank accounts, you'd handle routing/account numbers
        payload.bank_account = {
          // Bank account specific fields
        };
      }

      const result = await addPaymentMethod(payload);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      enqueueSnackbar('Payment method added successfully!', { variant: 'success' });
      
      // Reset form and close dialog
      resetForm();
      onClose();
      
    } catch (err) {
      console.error('Error adding payment method:', err);
      setError(err.message || 'Failed to add payment method. Please try again.');
      enqueueSnackbar(`Error: ${err.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActiveStep(0);
    setFormData({
      type: 'card',
      cardNumber: '',
      cardHolderName: '',
      expiryMonth: '',
      expiryYear: '',
      cvc: '',
      brand: '',
      isDefault: false,
      billingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'US',
      },
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Select the type of payment method you want to add:
              </Typography>
            </Grid>
            
            {PAYMENT_TYPES.map((type) => (
              <Grid item xs={12} sm={6} md={4} key={type.value}>
                <Card
                  onClick={() => {
                    setFormData(prev => ({ ...prev, type: type.value }));
                    handleNext();
                  }}
                  sx={{
                    cursor: 'pointer',
                    border: 2,
                    borderColor: formData.type === type.value ? 'primary.main' : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.light',
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ fontSize: 40, mb: 2, color: 'primary.main' }}>
                      {type.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {type.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.value === 'card' && 'Add a credit or debit card'}
                      {type.value === 'bank_account' && 'Connect your bank account'}
                      {type.value === 'wallet' && 'Add PayPal or other wallets'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 1:
        if (formData.type === 'card') {
          return (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Card Number"
                  name="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="4242 4242 4242 4242"
                  required
                  inputProps={{ maxLength: 19 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cardholder Name"
                  name="cardHolderName"
                  value={formData.cardHolderName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Month</InputLabel>
                      <Select
                        name="expiryMonth"
                        value={formData.expiryMonth}
                        onChange={handleChange}
                        label="Month"
                        required
                      >
                        <MenuItem value=""><em>Select</em></MenuItem>
                        {MONTHS.map(month => (
                          <MenuItem key={month.value} value={month.value}>
                            {month.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Year</InputLabel>
                      <Select
                        name="expiryYear"
                        value={formData.expiryYear}
                        onChange={handleChange}
                        label="Year"
                        required
                      >
                        <MenuItem value=""><em>Select</em></MenuItem>
                        {YEARS.map(year => (
                          <MenuItem key={year.value} value={year.value}>
                            {year.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CVC"
                  name="cvc"
                  value={formData.cvc}
                  onChange={handleChange}
                  placeholder="123"
                  required
                  inputProps={{ maxLength: 4 }}
                />
              </Grid>
              
              {formData.brand && (
                <Grid item xs={12}>
                  <Chip
                    label={formData.brand.toUpperCase()}
                    color="primary"
                    variant="outlined"
                    sx={{ textTransform: 'uppercase' }}
                  />
                </Grid>
              )}
            </Grid>
          );
        }
        
        return (
          <Alert severity="info">
            {formData.type === 'bank_account' 
              ? 'Bank account integration will be available soon.'
              : 'Digital wallet integration will be available soon.'}
          </Alert>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Payment Method
            </Typography>
            
            {formData.type === 'card' && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1">
                  <strong>Type:</strong> Credit/Debit Card
                </Typography>
                <Typography variant="body1">
                  <strong>Card:</strong> •••• {formData.cardNumber.slice(-4)}
                </Typography>
                <Typography variant="body1">
                  <strong>Expires:</strong> {formData.expiryMonth}/{formData.expiryYear}
                </Typography>
                <Typography variant="body1">
                  <strong>Name:</strong> {formData.cardHolderName}
                </Typography>
                
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Your card will be charged according to your subscription plan. 
                  All charges are secure and encrypted.
                </Alert>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    if (activeStep === 1 && formData.type === 'card') {
      return (
        formData.cardNumber.replace(/\s/g, '').length === 16 &&
        formData.cardHolderName.trim() &&
        formData.expiryMonth &&
        formData.expiryYear &&
        formData.cvc.length >= 3
      );
    }
    return true;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreditCardIcon color="primary" />
          <Typography variant="h6">Add Payment Method</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={activeStep === 0 ? handleClose : handleBack}
          disabled={loading}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading || (activeStep === 1 && !isStepValid())}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Processing...' : activeStep === steps.length - 1 ? 'Add Payment Method' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

AddPaymentMethodDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customerId: PropTypes.string,
  organizationId: PropTypes.string,
  onSuccess: PropTypes.func,
};

AddPaymentMethodDialog.defaultProps = {
  customerId: null,
  organizationId: null,
  onSuccess: null,
};

export default AddPaymentMethodDialog;
