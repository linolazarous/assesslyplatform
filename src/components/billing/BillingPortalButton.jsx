// src/components/billing/BillingPortalButton.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  Alert,
} from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";
import { createBillingPortalSession } from "../../api/subscriptionApi";
import { useSnackbar } from "notistack";

function BillingPortalButton({ 
  customerId, 
  organizationId, 
  variant = "contained", 
  fullWidth = true,
  size = "medium",
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);

  const handleManageBilling = async () => {
    if (!customerId) {
      enqueueSnackbar("No customer account found", { variant: "warning" });
      return;
    }

    try {
      setLoading(true);
      const session = await createBillingPortalSession(customerId, organizationId);
      
      if (session.url) {
        window.location.href = session.url;
      } else {
        enqueueSnackbar("Failed to create billing portal session", { variant: "error" });
      }
    } catch (err) {
      enqueueSnackbar(`Failed to access billing portal: ${err.message}`, { variant: "error" });
    } finally {
      setLoading(false);
      setOpenConfirm(false);
    }
  };

  const handleClick = () => {
    if (!customerId) {
      setOpenConfirm(true);
    } else {
      handleManageBilling();
    }
  };

  return (
    <>
      <Button
        variant={variant}
        color="primary"
        fullWidth={fullWidth}
        size={size}
        onClick={handleClick}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <SettingsIcon />}
        sx={{ 
          mt: 2,
          ...(variant === "contained" ? {} : { borderWidth: 2 })
        }}
      >
        {loading ? "Loading..." : "Manage Billing"}
      </Button>

      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>No Billing Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You don't have an active billing account yet. Please subscribe to a plan first.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              Once you subscribe to a plan, you'll be able to manage your billing settings here.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setOpenConfirm(false);
              // Navigate to pricing page
              window.location.href = "/pricing";
            }}
            color="primary"
          >
            View Plans
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

BillingPortalButton.propTypes = {
  customerId: PropTypes.string,
  organizationId: PropTypes.string,
  variant: PropTypes.oneOf(["contained", "outlined", "text"]),
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium", "large"]),
};

BillingPortalButton.defaultProps = {
  variant: "contained",
  fullWidth: true,
  size: "medium",
};

export default React.memo(BillingPortalButton);
