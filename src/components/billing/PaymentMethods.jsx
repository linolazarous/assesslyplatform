import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, List, ListItem, ListItemText, Alert } from "@mui/material";

function PaymentMethods({ methods = [] }) {
  if (!methods.length) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No payment methods saved.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Payment Methods
      </Typography>

      <List dense>
        {methods.map((m, idx) => (
          <ListItem key={idx}>
            <ListItemText
              primary={`${m.brand.toUpperCase()} •••• ${m.last4}`}
              secondary={`Expires ${m.exp_month}/${m.exp_year}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

PaymentMethods.propTypes = {
  methods: PropTypes.arrayOf(
    PropTypes.shape({
      brand: PropTypes.string,
      last4: PropTypes.string,
      exp_month: PropTypes.number,
      exp_year: PropTypes.number,
    })
  ),
};

export default React.memo(PaymentMethods);
