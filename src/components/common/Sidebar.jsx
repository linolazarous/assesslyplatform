import React from "react";
import PropTypes from "prop-types";
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
  useTheme,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  BarChart as ReportsIcon,
  Description as TemplatesIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../brand/Logo.jsx"; // ✅ Correct import (case-sensitive on Netlify & Linux)

const drawerWidth = 240;

/**
 * Sidebar Component
 * - Responsive drawer (permanent on desktop, temporary on mobile)
 * - Displays navigation + logout options
 * - Highlights active route
 */
function Sidebar({ mobileOpen, onDrawerToggle }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const currentPath = location.pathname;

  const menuItems = [
    { text: "Assessments", icon: <AssessmentIcon />, path: "/assessments" },
    { text: "Reports", icon: <ReportsIcon />, path: "/reports" },
    { text: "Templates", icon: <TemplatesIcon />, path: "/templates" },
  ];

  const bottomMenuItems = [
    { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
    { text: "Logout", icon: <LogoutIcon />, action: logout },
  ];

  const handleNavigation = (item) => {
    if (item.action) {
      item.action();
    } else {
      navigate(item.path);
    }
    if (isMobile) onDrawerToggle();
  };

  const menuList = (items) => (
    <List component="nav" disablePadding>
      {items.map((item) => {
        const isActive =
          item.path &&
          (currentPath === item.path ||
            (item.path === "/assessments" && currentPath.startsWith("/assessments/")));
        return (
          <ListItem
            key={item.text}
            onClick={() => handleNavigation(item)}
            selected={isActive}
            sx={{
              py: 1.2,
              px: 2,
              cursor: "pointer",
              "&.Mui-selected": {
                backgroundColor: theme.palette.action.selected,
              },
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.text}
              primaryTypographyProps={{
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "primary.main" : "text.primary",
              }}
            />
          </ListItem>
        );
      })}
    </List>
  );

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ justifyContent: "center", py: 3 }}>
        <Logo size={40} />
      </Toolbar>

      <Divider />

      {/* Top Menu */}
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>{menuList(menuItems)}</Box>

      <Divider />

      {/* Bottom Menu */}
      <Box sx={{ flexShrink: 0 }}>{menuList(bottomMenuItems)}</Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      aria-label="sidebar navigation"
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
          },
        }}
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

export default React.memo(Sidebar);
