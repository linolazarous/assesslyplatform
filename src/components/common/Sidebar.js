import React from 'react';
import { 
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  BarChart as ReportsIcon,
  Description as TemplatesIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../brand/logo';

const drawerWidth = 240;

export default function Sidebar({ mobileOpen, onDrawerToggle }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { text: 'Assessments', icon: <AssessmentIcon />, path: '/assessments' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
    { text: 'Templates', icon: <TemplatesIcon />, path: '/templates' }
  ];

  const bottomMenuItems = [
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Logout', icon: <LogoutIcon />, action: logout }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) onDrawerToggle();
  };

  const drawerContent = (
    <>
      <Toolbar sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <Logo size={40} />
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            sx={{
              '&:hover': {
                backgroundColor: theme.palette.action.hover
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List sx={{ mt: 'auto' }}>
        {bottomMenuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => item.action ? item.action() : handleNavigation(item.path)}
            sx={{
              '&:hover': {
                backgroundColor: theme.palette.action.hover
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ 
        width: { md: drawerWidth },
        flexShrink: { md: 0 }
      }}
      aria-label="assessment navigation"
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

Sidebar.propTypes = {
  mobileOpen: PropTypes.bool,
  onDrawerToggle: PropTypes.func
};
