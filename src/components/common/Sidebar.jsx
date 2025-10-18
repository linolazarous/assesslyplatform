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
import { useNavigate, useLocation } from 'react-router-dom';
// FIX: Added the mandatory .jsx extension for internal file imports
import { Logo } from '../brand/logo.jsx'; 
import PropTypes from 'prop-types';

const drawerWidth = 240;

export default function Sidebar({ mobileOpen, onDrawerToggle }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Define active route for highlighting selected link
  const currentPath = location.pathname;

  const menuItems = [
    { text: 'Assessments', icon: <AssessmentIcon />, path: '/assessments' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
    { text: 'Templates', icon: <TemplatesIcon />, path: '/templates' }
  ];

  const bottomMenuItems = [
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Logout', icon: <LogoutIcon />, action: logout }
  ];

  const handleNavigation = (item) => {
    if (item.action) {
      item.action();
    } else {
      navigate(item.path);
    }
    // Close the mobile drawer after navigation or action
    if (isMobile) onDrawerToggle();
  };

  const menuList = (items) => (
    <List component="nav">
      {items.map((item) => (
        <ListItem 
          button 
          key={item.text} 
          onClick={() => handleNavigation(item)}
          // Highlight the selected path, ensuring "Assessments" is highlighted for nested routes
          selected={item.path && (currentPath === item.path || (item.path === '/assessments' && currentPath.startsWith('/assessments/')))}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItem>
      ))}
    </List>
  );

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <Logo size={40} />
      </Toolbar>
      <Divider />
      
      {/* Top Menu Items */}
      <Box sx={{ flexGrow: 1 }}>
        {menuList(menuItems)}
      </Box>

      <Divider />

      {/* Bottom Menu Items */}
      <Box sx={{ flexShrink: 0 }}>
        {menuList(bottomMenuItems)}
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      aria-label="mailbox folders"
    >
      {/* Mobile Drawer (Temporary) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }} // Better open performance on mobile
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer (Permanent) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

Sidebar.propTypes = {
  mobileOpen: PropTypes.bool.isRequired,
  onDrawerToggle: PropTypes.func.isRequired,
};
