// src/components/OrgSelector.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Stack,
  Paper,
  Badge,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Business,
  AccountBalance,
  People,
  Settings,
  Add,
  Refresh,
  ArrowDropDown,
  ArrowDropUp,
  CheckCircle,
  Star,
  AdminPanelSettings,
  SupervisedUserCircle,
  Domain,
  Home,
  ExpandMore,
  KeyboardArrowRight,
  AccountCircle,
  Group,
  CorporateFare,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { fetchOrganizations, createOrganization, switchOrganization } from "../api/organizationApi";

export default function OrgSelector({
  currentOrg = null,
  setCurrentOrg = () => {},
  size = "medium",
  variant = "outlined",
  showLabel = true,
  showIcon = true,
  fullWidth = false,
  sx = {},
  onOrganizationChange = null,
  showCreateOption = false,
  showRefreshButton = false,
  disabled = false,
}) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  
  const { enqueueSnackbar } = useSnackbar();
  const { user, isSuperAdmin, currentOrganization, updateCurrentOrganization } = useAuth();

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizations();
      setOrganizations(data.data || data.items || data);
      
      // If no current org is set and we have organizations, set the first one
      if (!currentOrg && (data.data || data.items || data).length > 0) {
        const firstOrg = (data.data || data.items || data)[0];
        setCurrentOrg(firstOrg.id);
        updateCurrentOrganization(firstOrg);
      }
      
      // Update current organization details if we have a current org ID
      if (currentOrg && (data.data || data.items || data).length > 0) {
        const current = (data.data || data.items || data).find(org => org.id === currentOrg);
        if (current) {
          updateCurrentOrganization(current);
        }
      }
      
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setError(error.message);
      enqueueSnackbar(`Failed to load organizations: ${error.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentOrg, setCurrentOrg, updateCurrentOrganization, enqueueSnackbar]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrgs();
    enqueueSnackbar("Organizations refreshed", {
      variant: "success",
      autoHideDuration: 2000,
    });
  }, [fetchOrgs, enqueueSnackbar]);

  const handleOrganizationChange = useCallback(async (orgId) => {
    try {
      setLoading(true);
      const org = organizations.find(o => o.id === orgId);
      
      if (!org) {
        throw new Error("Organization not found");
      }
      
      // Update in context
      updateCurrentOrganization(org);
      
      // Update local state
      setCurrentOrg(orgId);
      
      // Call API to switch organization context if needed
      await switchOrganization(orgId);
      
      // Close popover if open
      setAnchorEl(null);
      
      // Callback
      if (onOrganizationChange) {
        onOrganizationChange(org);
      }
      
      enqueueSnackbar(`Switched to ${org.name}`, {
        variant: "success",
        autoHideDuration: 3000,
      });
      
    } catch (error) {
      console.error("Error switching organization:", error);
      enqueueSnackbar(`Failed to switch organization: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [organizations, setCurrentOrg, updateCurrentOrganization, onOrganizationChange, enqueueSnackbar]);

  const handleCreateOrganization = useCallback(async () => {
    if (!newOrgName.trim()) {
      enqueueSnackbar("Organization name is required", { variant: "error" });
      return;
    }
    
    setCreatingOrg(true);
    try {
      const newOrg = await createOrganization({
        name: newOrgName.trim(),
        description: "",
        isActive: true,
      });
      
      setOrganizations(prev => [...prev, newOrg]);
      setNewOrgName("");
      
      // Switch to the new organization
      await handleOrganizationChange(newOrg.id);
      
      enqueueSnackbar(`Organization "${newOrg.name}" created successfully`, {
        variant: "success",
      });
      
    } catch (error) {
      console.error("Error creating organization:", error);
      enqueueSnackbar(`Failed to create organization: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setCreatingOrg(false);
    }
  }, [newOrgName, handleOrganizationChange, enqueueSnackbar]);

  const currentOrganizationData = useMemo(() => {
    return organizations.find(org => org.id === currentOrg) || currentOrganization;
  }, [organizations, currentOrg, currentOrganization]);

  const getOrganizationIcon = (org) => {
    if (org.isDefault) return <Home />;
    if (org.isPrimary) return <Star />;
    if (org.type === 'enterprise') return <CorporateFare />;
    if (org.type === 'team') return <Group />;
    return <Business />;
  };

  const getOrganizationColor = (org) => {
    if (org.isDefault) return "primary";
    if (org.isPrimary) return "warning";
    if (org.type === 'enterprise') return "secondary";
    if (org.type === 'team') return "info";
    return "default";
  };

  const renderOrganizationBadge = (org) => {
    if (!org) return null;
    
    const badges = [];
    if (org.isDefault) {
      badges.push({ label: "Default", color: "primary" });
    }
    if (org.isPrimary) {
      badges.push({ label: "Primary", color: "warning" });
    }
    if (org.status === 'active') {
      badges.push({ label: "Active", color: "success" });
    }
    if (org.memberCount > 100) {
      badges.push({ label: "Large", color: "info" });
    }
    
    return (
      <Stack direction="row" spacing={0.5}>
        {badges.map((badge, index) => (
          <Chip
            key={index}
            label={badge.label}
            size="small"
            color={badge.color}
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        ))}
      </Stack>
    );
  };

  const renderSelect = () => (
    <FormControl
      size={size}
      variant={variant}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      sx={{ ...sx }}
    >
      {showLabel && <InputLabel id="organization-select-label">Organization</InputLabel>}
      <Select
        labelId="organization-select-label"
        value={currentOrg || ""}
        label={showLabel ? "Organization" : ""}
        onChange={(e) => handleOrganizationChange(e.target.value)}
        IconComponent={ExpandMore}
        startAdornment={
          showIcon && currentOrganizationData ? (
            <Avatar
              sx={{
                width: 24,
                height: 24,
                mr: 1,
                bgcolor: `${getOrganizationColor(currentOrganizationData)}.light`,
              }}
            >
              {getOrganizationIcon(currentOrganizationData)}
            </Avatar>
          ) : null
        }
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Typography variant="body2" color="text.secondary">
                Select Organization
              </Typography>
            );
          }
          
          const org = organizations.find(o => o.id === selected);
          if (!org) return null;
          
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {showIcon && (
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: `${getOrganizationColor(org)}.light`,
                  }}
                >
                  {getOrganizationIcon(org)}
                </Avatar>
              )}
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {org.name}
                </Typography>
                {org.description && (
                  <Typography variant="caption" color="text.secondary">
                    {org.description}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        }}
      >
        {organizations.map((org) => (
          <MenuItem key={org.id} value={org.id} sx={{ py: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  mr: 2,
                  bgcolor: `${getOrganizationColor(org)}.light`,
                }}
              >
                {getOrganizationIcon(org)}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {org.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {org.description || `${org.memberCount || 0} members`}
                </Typography>
                {renderOrganizationBadge(org)}
              </Box>
              {org.id === currentOrg && (
                <CheckCircle fontSize="small" color="success" sx={{ ml: 2 }} />
              )}
            </Box>
          </MenuItem>
        ))}
        
        {showCreateOption && (
          <Box>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={() => setAnchorEl(document.getElementById('org-selector'))}>
              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: "success.light" }}>
                  <Add />
                </Avatar>
                <Typography variant="body2" color="primary">
                  Create New Organization
                </Typography>
              </Box>
            </MenuItem>
          </Box>
        )}
      </Select>
    </FormControl>
  );

  const renderPopover = () => (
    <Box>
      <Button
        variant="outlined"
        size={size}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ArrowDropDown />}
        startIcon={
          showIcon && currentOrganizationData ? (
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: `${getOrganizationColor(currentOrganizationData)}.light`,
              }}
            >
              {getOrganizationIcon(currentOrganizationData)}
            </Avatar>
          ) : null
        }
        sx={{
          justifyContent: "space-between",
          textTransform: "none",
          ...sx,
        }}
        fullWidth={fullWidth}
        disabled={disabled || loading}
      >
        {currentOrganizationData ? (
          <Box sx={{ textAlign: "left", flexGrow: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              {currentOrganizationData.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentOrganizationData.description || "Organization"}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select Organization
          </Typography>
        )}
      </Button>
      
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Paper sx={{ width: 320, maxHeight: 400, overflow: "auto" }}>
          <Box sx={{ p: 2, bgcolor: "primary.main", color: "white" }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Organizations
            </Typography>
            <Typography variant="caption">
              Switch between your organizations
            </Typography>
          </Box>
          
          <List>
            {organizations.map((org) => (
              <ListItem
                key={org.id}
                button
                selected={org.id === currentOrg}
                onClick={() => handleOrganizationChange(org.id)}
                sx={{
                  borderLeft: org.id === currentOrg ? 4 : 0,
                  borderColor: "primary.main",
                }}
              >
                <ListItemIcon>
                  <Avatar
                    sx={{
                      bgcolor: `${getOrganizationColor(org)}.light`,
                      color: `${getOrganizationColor(org)}.dark`,
                    }}
                  >
                    {getOrganizationIcon(org)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="medium">
                      {org.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {org.description || `${org.memberCount || 0} members`}
                    </Typography>
                  }
                />
                {org.id === currentOrg && (
                  <CheckCircle fontSize="small" color="success" />
                )}
              </ListItem>
            ))}
            
            {showCreateOption && (
              <>
                <Divider />
                <ListItem
                  button
                  onClick={() => {
                    setAnchorEl(null);
                    // Open create organization dialog
                    enqueueSnackbar("Create organization feature coming soon", {
                      variant: "info",
                    });
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: "success.light" }}>
                      <Add />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="primary">
                        Create New Organization
                      </Typography>
                    }
                  />
                </ListItem>
              </>
            )}
          </List>
          
          <Divider />
          
          <Box sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
            </Typography>
            {showRefreshButton && (
              <Tooltip title="Refresh organizations">
                <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Paper>
      </Popover>
    </Box>
  );

  if (loading && organizations.length === 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width={120} height={24} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
        <Skeleton variant="rectangular" width={24} height={24} />
      </Box>
    );
  }

  if (error && organizations.length === 0) {
    return (
      <Alert
        severity="error"
        sx={{ maxWidth: fullWidth ? "100%" : 400 }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Retry
          </Button>
        }
      >
        <Typography variant="body2">
          Failed to load organizations: {error}
        </Typography>
      </Alert>
    );
  }

  if (organizations.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          textAlign: "center",
          border: "1px dashed",
          borderColor: "divider",
          bgcolor: "background.default",
        }}
      >
        <Business sx={{ fontSize: 48, color: "text.secondary", mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Organizations
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {isSuperAdmin
            ? "Create your first organization to get started"
            : "You are not a member of any organizations"}
        </Typography>
        {showCreateOption && isSuperAdmin && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleCreateOrganization()}
            sx={{ mt: 1 }}
          >
            Create Organization
          </Button>
        )}
      </Paper>
    );
  }

  // Use popover style for better UX with many organizations
  return organizations.length > 3 ? renderPopover() : renderSelect();
}

OrgSelector.propTypes = {
  currentOrg: PropTypes.string,
  setCurrentOrg: PropTypes.func,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  variant: PropTypes.oneOf(["outlined", "filled", "standard"]),
  showLabel: PropTypes.bool,
  showIcon: PropTypes.bool,
  fullWidth: PropTypes.bool,
  sx: PropTypes.object,
  onOrganizationChange: PropTypes.func,
  showCreateOption: PropTypes.bool,
  showRefreshButton: PropTypes.bool,
  disabled: PropTypes.bool,
};

OrgSelector.defaultProps = {
  currentOrg: null,
  setCurrentOrg: () => {},
  size: "medium",
  variant: "outlined",
  showLabel: true,
  showIcon: true,
  fullWidth: false,
  sx: {},
  onOrganizationChange: null,
  showCreateOption: false,
  showRefreshButton: false,
  disabled: false,
};
