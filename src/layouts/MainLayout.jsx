import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import PropTypes from 'prop-types';
import Navbar from '../components/common/Navbar.jsx';
import Sidebar from '../components/common/Sidebar.jsx';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

export default function MainLayout({ children }) {
  const { currentUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const isSidebarVisible = !!currentUser;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      {/* Navbar */}
      <Navbar 
        showNavigation={!isSidebarVisible} // Show nav links if user is not logged in
        onDrawerToggle={handleDrawerToggle}
      />

      {/* Sidebar (desktop + mobile) */}
      {isSidebarVisible && (
        <Sidebar 
          mobileOpen={mobileOpen} 
          onDrawerToggle={handleDrawerToggle} 
          drawerWidth={drawerWidth} 
        />
      )}

      {/* Main content */}
      <Box
        component="main"
        {...(mobileOpen ? { inert: "" } : {})}
        sx={(theme) => ({
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, md: isSidebarVisible ? `${drawerWidth}px` : 0 },
          pt: { xs: 8, sm: 8 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        })}
      >
        {/* Toolbar spacer */}
        <Toolbar sx={{ display: 'none' }} />
        {children}
      </Box>
    </Box>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
