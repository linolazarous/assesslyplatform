// src/pages/Profile/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  TextField,
  Button,
  IconButton,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Person,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Security,
  Notifications,
  Language,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Password Strength Indicator
const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    
    // Length check
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    
    // Complexity checks
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    return Math.min(score, 5);
  };

  const strength = getStrength(password);
  const colors = ['error', 'error', 'warning', 'warning', 'success', 'success'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Box
            key={level}
            sx={{
              flex: 1,
              height: 4,
              bgcolor: level <= strength ? `${colors[strength]}.main` : 'grey.300',
              borderRadius: 1,
            }}
          />
        ))}
      </Box>
      <Typography variant="caption" color={`${colors[strength]}.main`}>
        {labels[strength]}
      </Typography>
    </Box>
  );
};

// Activity Log Item
const ActivityLogItem = ({ activity }) => {
  const getActivityIcon = (type) => {
    const icons = {
      login: <Security color="primary" />,
      assessment_taken: <CheckCircle color="success" />,
      profile_update: <Edit color="info" />,
      password_change: <Lock color="warning" />,
    };
    return icons[type] || <Person color="action" />;
  };

  return (
    <ListItem sx={{ px: 0 }}>
      <ListItemIcon>
        {getActivityIcon(activity.type)}
      </ListItemIcon>
      <ListItemText
        primary={activity.description}
        secondary={format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
      />
      <Chip
        label={activity.ipAddress}
        size="small"
        variant="outlined"
      />
    </ListItem>
  );
};

const Profile = () => {
  const { showSnackbar } = useSnackbar();
  const { user, updateUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    assessmentReminders: true,
    weeklyReports: false,
    securityAlerts: true,
  });

  // Form states
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    jobTitle: '',
    department: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Load user data and activity logs
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
      });
    }

    fetchActivityLogs();
    fetchNotifications();
  }, [user]);

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch('/api/users/activity', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.slice(0, 10)); // Show last 10 activities
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/users/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditToggle = () => {
    if (editing) {
      // Reset form
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
      });
    }
    setEditing(!editing);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        updateUser(updatedUser);
        showSnackbar('Profile updated successfully', 'success');
        setEditing(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      showSnackbar('Failed to update profile', 'error');
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showSnackbar('Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showSnackbar('Image size should be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });
      
      if (response.ok) {
        const { avatarUrl } = await response.json();
        updateUser({ ...user, avatar: avatarUrl });
        showSnackbar('Profile picture updated successfully', 'success');
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch (error) {
      showSnackbar('Failed to upload profile picture', 'error');
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (response.ok) {
        showSnackbar('Password changed successfully', 'success');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setPasswordDialogOpen(false);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
    } catch (error) {
      showSnackbar(error.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async (key, value) => {
    const updatedNotifications = { ...notifications, [key]: value };
    setNotifications(updatedNotifications);
    
    try {
      await fetch('/api/users/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedNotifications),
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  };

  const handleShowPassword = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Profile - Assessly Platform</title>
      </Helmet>

      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            My Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your personal information, security settings, and preferences
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Left Column - Profile Summary */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 24 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    src={user.avatar}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      fontSize: 48,
                      mb: 2,
                      border: '4px solid',
                      borderColor: 'primary.main',
                    }}
                  >
                    {getInitials(user.name)}
                  </Avatar>
                  
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="avatar-upload"
                    type="file"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                  
                  <label htmlFor="avatar-upload">
                    <IconButton
                      component="span"
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                      disabled={uploading}
                    >
                      {uploading ? <CircularProgress size={20} /> : <PhotoCamera />}
                    </IconButton>
                  </label>
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  {user.name || 'Unnamed User'}
                </Typography>
                
                <Chip
                  label={user.role?.replace('_', ' ').toUpperCase()}
                  color="primary"
                  size="small"
                  sx={{ mb: 1 }}
                />
                
                <Typography variant="body2" color="text.secondary">
                  {user.jobTitle || 'No title specified'}
                </Typography>
                
                {user.organization && (
                  <Typography variant="body2" color="text.secondary">
                    {user.organization.name}
                  </Typography>
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Quick Stats */}
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Email fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email" 
                    secondary={user.email}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItem>
                
                {user.phone && (
                  <ListItem>
                    <ListItemIcon>
                      <Phone fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Phone" 
                      secondary={user.phone}
                    />
                  </ListItem>
                )}
                
                {user.location && (
                  <ListItem>
                    <ListItemIcon>
                      <LocationOn fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Location" 
                      secondary={user.location}
                    />
                  </ListItem>
                )}
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Member Since" 
                    secondary={format(new Date(user.createdAt), 'MMM yyyy')}
                  />
                </ListItem>
              </List>
              
              <Box sx={{ mt: 3 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Lock />}
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  Change Password
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Profile Details */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 0 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab icon={<Person />} label="Profile" />
                <Tab icon={<Security />} label="Security" />
                <Tab icon={<Notifications />} label="Notifications" />
                <Tab icon={<Language />} label="Activity" />
              </Tabs>

              {/* Profile Tab */}
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Personal Information
                  </Typography>
                  
                  <Button
                    startIcon={editing ? <Cancel /> : <Edit />}
                    onClick={handleEditToggle}
                    variant={editing ? 'outlined' : 'contained'}
                  >
                    {editing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOn />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Job Title"
                      value={profileData.jobTitle}
                      onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                      disabled={!editing}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Department"
                      value={profileData.department}
                      onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                      disabled={!editing}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Bio"
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      disabled={!editing}
                      multiline
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </Grid>
                  
                  {editing && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button
                          variant="outlined"
                          onClick={handleEditToggle}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleSaveProfile}
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                        >
                          Save Changes
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              {/* Security Tab */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom>
                  Security Settings
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  Manage your password and security preferences here.
                </Alert>
                
                <Box sx={{ maxWidth: 400 }}>
                  <Button
                    variant="contained"
                    startIcon={<Lock />}
                    onClick={() => setPasswordDialogOpen(true)}
                  >
                    Change Password
                  </Button>
                  
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Session Management
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={async () => {
                        try {
                          await fetch('/api/auth/logout-all', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            },
                          });
                          showSnackbar('Logged out from all other devices', 'success');
                        } catch (error) {
                          showSnackbar('Failed to logout from other devices', 'error');
                        }
                      }}
                    >
                      Logout from All Other Devices
                    </Button>
                  </Box>
                </Box>
              </TabPanel>

              {/* Notifications Tab */}
              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>
                  Notification Preferences
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Choose how you want to be notified about activities on your account.
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Email Updates"
                      secondary="Receive important updates via email"
                    />
                    <Switch
                      checked={notifications.emailUpdates}
                      onChange={(e) => handleNotificationToggle('emailUpdates', e.target.checked)}
                    />
                  </ListItem>
                  
                  <Divider />
                  
                  <ListItem>
                    <ListItemText
                      primary="Assessment Reminders"
                      secondary="Get reminders for upcoming assessments"
                    />
                    <Switch
                      checked={notifications.assessmentReminders}
                      onChange={(e) => handleNotificationToggle('assessmentReminders', e.target.checked)}
                    />
                  </ListItem>
                  
                  <Divider />
                  
                  <ListItem>
                    <ListItemText
                      primary="Weekly Reports"
                      secondary="Receive weekly performance reports"
                    />
                    <Switch
                      checked={notifications.weeklyReports}
                      onChange={(e) => handleNotificationToggle('weeklyReports', e.target.checked)}
                    />
                  </ListItem>
                  
                  <Divider />
                  
                  <ListItem>
                    <ListItemText
                      primary="Security Alerts"
                      secondary="Get notified about security-related activities"
                    />
                    <Switch
                      checked={notifications.securityAlerts}
                      onChange={(e) => handleNotificationToggle('securityAlerts', e.target.checked)}
                    />
                  </ListItem>
                </List>
              </TabPanel>

              {/* Activity Tab */}
              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Your recent activities on the platform.
                </Typography>
                
                {activityLogs.length > 0 ? (
                  <Paper variant="outlined">
                    <List disablePadding>
                      {activityLogs.map((activity, index) => (
                        <React.Fragment key={activity.id}>
                          <ActivityLogItem activity={activity} />
                          {index < activityLogs.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Paper>
                ) : (
                  <Alert severity="info">
                    No activity logs found.
                  </Alert>
                )}
                
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={fetchActivityLogs}
                  >
                    Load More Activity
                  </Button>
                </Box>
              </TabPanel>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Change Password Dialog */}
      <Dialog 
        open={passwordDialogOpen} 
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => handleShowPassword('current')}>
                        {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => handleShowPassword('new')}>
                        {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <PasswordStrengthIndicator password={passwordData.newPassword} />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                error={passwordData.newPassword !== passwordData.confirmPassword}
                helperText={
                  passwordData.newPassword !== passwordData.confirmPassword
                    ? 'Passwords do not match'
                    : ''
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => handleShowPassword('confirm')}>
                        {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={loading || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
            startIcon={loading ? <CircularProgress size={20} /> : <Lock />}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default React.memo(Profile);
