// src/pages/Settings/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  InputAdornment,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Save,
  Add,
  Delete,
  Edit,
  Language,
  Palette,
  Security,
  Notifications,
  Api,
  Backup,
  Download,
  Upload,
  Refresh,
  Help,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';

// API Key Item Component
const ApiKeyItem = ({ apiKey, onRevoke }) => {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ListItem>
      <ListItemText
        primary={apiKey.name}
        secondary={`Created: ${formatDate(apiKey.createdAt)} • Last used: ${apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Never'}`}
      />
      <ListItemSecondaryAction>
        <IconButton onClick={handleCopy} size="small" sx={{ mr: 1 }}>
          {copied ? <CheckCircle color="success" /> : <Edit />}
        </IconButton>
        <IconButton onClick={() => onRevoke(apiKey.id)} size="small" color="error">
          <Delete />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

// Backup Stepper Component
const BackupStepper = ({ activeStep, onClose, onComplete }) => {
  const steps = ['Select Data', 'Configure Format', 'Download Backup'];
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 2000));
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {activeStep === 0 && (
        <Box>
          <Typography gutterBottom>Select data to backup:</Typography>
          <FormControlLabel control={<Switch defaultChecked />} label="Assessments" />
          <FormControlLabel control={<Switch defaultChecked />} label="User Data" />
          <FormControlLabel control={<Switch />} label="Analytics Data" />
        </Box>
      )}
      
      {activeStep === 1 && (
        <Box>
          <Typography gutterBottom>Select backup format:</Typography>
          {/* Format selection options */}
        </Box>
      )}
      
      {activeStep === 2 && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography gutterBottom>
            Your backup is ready to download.
          </Typography>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <Download />}
            onClick={handleDownload}
            disabled={loading}
          >
            Download Backup
          </Button>
        </Box>
      )}
    </Box>
  );
};

const Settings = () => {
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backupStep, setBackupStep] = useState(0);
  const [newApiKeyDialog, setNewApiKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // Settings states
  const [generalSettings, setGeneralSettings] = useState({
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    density: 'comfortable',
    fontSize: 'medium',
    reduceAnimations: false,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginNotifications: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    assessmentUpdates: true,
    systemAlerts: true,
    marketingEmails: false,
  });

  const [apiSettings, setApiSettings] = useState({
    rateLimit: 100,
    webhookUrl: '',
    enableWebhooks: false,
  });

  // Load settings and API keys
  useEffect(() => {
    loadSettings();
    loadApiKeys();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneralSettings(data.general || generalSettings);
        setAppearanceSettings(data.appearance || appearanceSettings);
        setSecuritySettings(data.security || securitySettings);
        setNotificationSettings(data.notifications || notificationSettings);
        setApiSettings(data.api || apiSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/settings/api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    
    try {
      const settings = {
        general: generalSettings,
        appearance: appearanceSettings,
        security: securitySettings,
        notifications: notificationSettings,
        api: apiSettings,
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        showSnackbar('Settings saved successfully', 'success');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      showSnackbar('Failed to save settings', 'error');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      showSnackbar('Please enter a name for the API key', 'error');
      return;
    }

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newKeyName }),
      });
      
      if (response.ok) {
        const newKey = await response.json();
        setApiKeys([...apiKeys, newKey]);
        showSnackbar('API key created successfully', 'success');
        setNewKeyName('');
        setNewApiKeyDialog(false);
      }
    } catch (error) {
      showSnackbar('Failed to create API key', 'error');
    }
  };

  const handleRevokeApiKey = async (keyId) => {
    try {
      const response = await fetch(`/api/settings/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
        showSnackbar('API key revoked successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to revoke API key', 'error');
    }
  };

  const handleBackupStart = () => {
    setBackupDialogOpen(true);
    setBackupStep(0);
  };

  const handleBackupComplete = () => {
    setBackupDialogOpen(false);
    showSnackbar('Backup completed successfully', 'success');
  };

  const handleBackupNext = () => {
    setBackupStep((prevStep) => Math.min(prevStep + 1, 2));
  };

  const handleBackupBack = () => {
    setBackupStep((prevStep) => Math.max(prevStep - 1, 0));
  };

  const handleExportSettings = () => {
    const settings = {
      general: generalSettings,
      appearance: appearanceSettings,
      security: securitySettings,
      notifications: notificationSettings,
      api: apiSettings,
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assessly-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showSnackbar('Settings exported successfully', 'success');
  };

  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        // Validate and apply settings
        // This is a simplified version - in production, you'd want proper validation
        setGeneralSettings(importedSettings.general || generalSettings);
        setAppearanceSettings(importedSettings.appearance || appearanceSettings);
        setSecuritySettings(importedSettings.security || securitySettings);
        setNotificationSettings(importedSettings.notifications || notificationSettings);
        setApiSettings(importedSettings.api || apiSettings);
        
        showSnackbar('Settings imported successfully', 'success');
      } catch (error) {
        showSnackbar('Invalid settings file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      // Reset to default values
      setGeneralSettings({
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      });
      setAppearanceSettings({
        theme: 'light',
        density: 'comfortable',
        fontSize: 'medium',
        reduceAnimations: false,
      });
      setSecuritySettings({
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordExpiry: 90,
        loginNotifications: true,
      });
      setNotificationSettings({
        emailNotifications: true,
        pushNotifications: false,
        assessmentUpdates: true,
        systemAlerts: true,
        marketingEmails: false,
      });
      setApiSettings({
        rateLimit: 100,
        webhookUrl: '',
        enableWebhooks: false,
      });
      
      showSnackbar('Settings reset to defaults', 'info');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if user has permission to modify settings
  const canModifySettings = user?.role === 'super_admin' || user?.role === 'organization_admin';

  return (
    <>
      <Helmet>
        <title>Settings - Assessly Platform</title>
      </Helmet>

      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure platform preferences, security, and integration settings
          </Typography>
        </Box>

        {!canModifySettings && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You have limited permissions to modify settings. Contact your organization administrator for full access.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* General Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Language sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">General</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Language"
                    value={generalSettings.language}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="de">Deutsch</MenuItem>
                    <MenuItem value="ja">日本語</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Timezone"
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value="UTC">UTC</MenuItem>
                    <MenuItem value="America/New_York">Eastern Time</MenuItem>
                    <MenuItem value="America/Chicago">Central Time</MenuItem>
                    <MenuItem value="America/Denver">Mountain Time</MenuItem>
                    <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                    <MenuItem value="Europe/London">London</MenuItem>
                    <MenuItem value="Europe/Paris">Paris</MenuItem>
                    <MenuItem value="Asia/Tokyo">Tokyo</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Date Format"
                    value={generalSettings.dateFormat}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Time Format"
                    value={generalSettings.timeFormat}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timeFormat: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value="12h">12-hour</MenuItem>
                    <MenuItem value="24h">24-hour</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Appearance Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Palette sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Appearance</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Theme"
                    value={appearanceSettings.theme}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, theme: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="auto">Auto (System)</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Density"
                    value={appearanceSettings.density}
                    onChange={(e) => setAppearanceSettings({ ...appearanceSettings, density: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value="comfortable">Comfortable</MenuItem>
                    <MenuItem value="compact">Compact</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appearanceSettings.reduceAnimations}
                        onChange={(e) => setAppearanceSettings({ ...appearanceSettings, reduceAnimations: e.target.checked })}
                        disabled={!canModifySettings}
                      />
                    }
                    label="Reduce animations (improves performance)"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Security</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
                        disabled={!canModifySettings}
                      />
                    }
                    label="Enable Two-Factor Authentication"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Session Timeout"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value={15}>15 minutes</MenuItem>
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={120}>2 hours</MenuItem>
                    <MenuItem value={0}>Never (not recommended)</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Password Expiry"
                    value={securitySettings.passwordExpiry}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
                    disabled={!canModifySettings}
                  >
                    <MenuItem value={30}>30 days</MenuItem>
                    <MenuItem value={60}>60 days</MenuItem>
                    <MenuItem value={90}>90 days</MenuItem>
                    <MenuItem value={180}>180 days</MenuItem>
                    <MenuItem value={0}>Never (not recommended)</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securitySettings.loginNotifications}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, loginNotifications: e.target.checked })}
                        disabled={!canModifySettings}
                      />
                    }
                    label="Notify on new login from unknown devices"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Notification Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Notifications sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                      />
                    }
                    label="Email Notifications"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
                      />
                    }
                    label="Push Notifications (in-app)"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.assessmentUpdates}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, assessmentUpdates: e.target.checked })}
                      />
                    }
                    label="Assessment Updates"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.systemAlerts}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, systemAlerts: e.target.checked })}
                      />
                    }
                    label="System Alerts"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.marketingEmails}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, marketingEmails: e.target.checked })}
                      />
                    }
                    label="Marketing Emails"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* API Settings */}
          {canModifySettings && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Api sx={{ mr: 1 }} color="primary" />
                  <Typography variant="h6">API & Integrations</Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Rate Limiting
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      value={apiSettings.rateLimit}
                      onChange={(e) => setApiSettings({ ...apiSettings, rateLimit: e.target.value })}
                    >
                      <MenuItem value={50}>50 requests/minute</MenuItem>
                      <MenuItem value={100}>100 requests/minute</MenuItem>
                      <MenuItem value={250}>250 requests/minute</MenuItem>
                      <MenuItem value={500}>500 requests/minute</MenuItem>
                      <MenuItem value={0}>Unlimited (not recommended)</MenuItem>
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={apiSettings.enableWebhooks}
                          onChange={(e) => setApiSettings({ ...apiSettings, enableWebhooks: e.target.checked })}
                        />
                      }
                      label="Enable Webhooks"
                    />
                  </Grid>
                  
                  {apiSettings.enableWebhooks && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Webhook URL"
                        value={apiSettings.webhookUrl}
                        onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                        placeholder="https://your-domain.com/webhook"
                      />
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      API Keys
                    </Typography>
                    
                    {apiKeys.length > 0 ? (
                      <Paper variant="outlined" sx={{ mb: 2 }}>
                        <List>
                          {apiKeys.map((key) => (
                            <ApiKeyItem
                              key={key.id}
                              apiKey={key}
                              onRevoke={handleRevokeApiKey}
                            />
                          ))}
                        </List>
                      </Paper>
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        No API keys generated yet.
                      </Alert>
                    )}
                    
                    <Button
                      startIcon={<Add />}
                      onClick={() => setNewApiKeyDialog(true)}
                    >
                      Generate New API Key
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Data Management */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Backup sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6">Data Management</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Export Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Export all your settings to a JSON file for backup or transfer.
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        startIcon={<Download />}
                        onClick={handleExportSettings}
                      >
                        Export Settings
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Import Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Import settings from a previously exported JSON file.
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <input
                        accept=".json"
                        style={{ display: 'none' }}
                        id="import-settings"
                        type="file"
                        onChange={handleImportSettings}
                      />
                      <label htmlFor="import-settings">
                        <Button
                          component="span"
                          startIcon={<Upload />}
                        >
                          Import Settings
                        </Button>
                      </label>
                    </CardActions>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<Backup />}
                      onClick={handleBackupStart}
                    >
                      Create Backup
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={handleResetSettings}
                      color="warning"
                    >
                      Reset to Defaults
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Help />}
                href="/help/settings"
                target="_blank"
              >
                Help
              </Button>
              
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={saveSettings}
                disabled={saving || !canModifySettings}
              >
                Save Changes
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Create API Key Dialog */}
      <Dialog
        open={newApiKeyDialog}
        onClose={() => setNewApiKeyDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate New API Key</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Key Name"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., Production API Key"
            sx={{ mt: 2 }}
          />
          <Alert severity="warning" sx={{ mt: 2 }}>
            Store this key securely. You won't be able to see it again after generation.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewApiKeyDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateApiKey}
          >
            Generate Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog
        open={backupDialogOpen}
        onClose={() => setBackupDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Data Backup</DialogTitle>
        <DialogContent>
          <BackupStepper
            activeStep={backupStep}
            onComplete={handleBackupComplete}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBackupBack} disabled={backupStep === 0}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={backupStep === 2 ? handleBackupComplete : handleBackupNext}
          >
            {backupStep === 2 ? 'Finish' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default React.memo(Settings);
