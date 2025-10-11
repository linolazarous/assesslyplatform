import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import PropTypes from 'prop-types';
// FIX: Align imports to use the corrected .jsx file extension
import Navbar from '../components/common/Navbar.jsx'; 
import Sidebar from '../components/common/Sidebar.jsx'; // FIX: Align import
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240; // Define drawerWidth constant for calculation consistency

export default function MainLayout({ children }) {
  const { currentUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Determine the sidebar width used for margin calculation
  const sidebarWidth = currentUser ? drawerWidth : 0;
  // Determine if the sidebar is visible
  const isSidebarVisible = !!currentUser; 

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Navbar will always render, but controls visibility of navigation links */}
      <Navbar 
        showNavigation={!isSidebarVisible} // Show nav links if not logged in
        onDrawerToggle={handleDrawerToggle} // Used to open mobile sidebar
      />
      
      {isSidebarVisible && (
        <Sidebar 
          mobileOpen={mobileOpen} 
          onDrawerToggle={handleDrawerToggle} 
        />
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', md: `calc(100% - ${sidebarWidth}px)` }, // Full width on mobile, adjusted on desktop
          // Use Toolbar as a spacer for the Header, allowing content to start below it
          pt: { xs: 8, sm: 8 }, 
          
          // Desktop margin calculation to make space for the permanent sidebar
          ml: { 
            xs: 0, 
            md: sidebarWidth 
          },
          transition: (theme) => theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* We keep the Toolbar spacer here, but adjust pT in the main Box for better control */}
        <Toolbar sx={{ display: 'none' }} /> 
        {children}
      </Box>
    </Box>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired
};
