import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert
} from '@mui/material';
import { 
  CreditCard as CreditCardIcon, 
  Settings as SettingsIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import BillingPortalButton from './BillingPortalButton.jsx'; // Assuming co-location

// Mock data structure
const MOCK_PAYMENT_METHODS = [
  { id: 1, type: 'Visa', last4: '4242', exp: '12/26', primary: true },
  { id: 2, type: 'Mastercard', last4: '8899', exp: '05/24', primary: false },
];

export default function PaymentMethods({ orgId }) {
    // In a real app, this would use a useState and useEffect hook to fetch payment methods
    // const [paymentMethods, setPaymentMethods] = useState([]);
    const paymentMethods = MOCK_PAYMENT_METHODS; 

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Payment Methods
        </Typography>
        <BillingPortalButton orgId={orgId} />
      </Box>
      
      <Divider sx={{ mb: 2 }} />

      {paymentMethods.length === 0 ? (
        <Alert severity="warning" icon={<PaymentIcon />}>
          No saved payment methods. Please use the "Manage Billing" button to add one.
        </Alert>
      ) : (
        <List>
          {paymentMethods.map((method) => (
            <ListItem 
              key={method.id} 
              secondaryAction={
                method.primary && (
                  <Button size="small" variant="text" disabled>Primary</Button>
                )
              }
              sx={{ border: method.primary ? '1px solid #4CAF50' : 'none', borderRadius: 1, my: 1 }}
            >
              <ListItemIcon>
                <CreditCardIcon color={method.primary ? 'success' : 'action'} />
              </ListItemIcon>
              <ListItemText
                primary={`${method.type} ending in ${method.last4}`}
                secondary={`Expires ${method.exp}`}
              />
            </ListItem>
          ))}
          <ListItem sx={{ mt: 2 }}>
            <ListItemIcon>
                <SettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary="To change, add, or delete payment methods, please use the Stripe Customer Portal."
              secondary="This keeps your financial data secure."
            />
          </ListItem>
        </List>
      )}
    </Paper>
  );
}

PaymentMethods.propTypes = {
  orgId: PropTypes.string.isRequired
};
