import React from "react";
import PropTypes from "prop-types";
import { Button } from "@mui/material";

function BillingPortalButton({ onManageBilling }) {
  return (
    <Button
      variant="contained"
      color="primary"
      fullWidth
      sx={{ mt: 2 }}
      onClick={onManageBilling}
    >
      Manage Billing
    </Button>
  );
}

BillingPortalButton.propTypes = {
  onManageBilling: PropTypes.func.isRequired,
};

export default React.memo(BillingPortalButton);
