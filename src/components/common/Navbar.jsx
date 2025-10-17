import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Container,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
// FIX: Corrected relative path to go up one directory (../) before accessing 'brand'
import Logo from "../brand/logo.jsx"; 

function Navbar({ links = [] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar>
          <Container
            maxWidth="xl"
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Logo size={32} />
              <Typography variant="h6" fontWeight={600}>
                Assessly
              </Typography>
            </Box>

            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 3 }}>
              {links.map((link, idx) => (
                <Typography
                  key={idx}
                  variant="body2"
                  sx={{ cursor: "pointer", "&:hover": { color: "primary.main" } }}
                  onClick={() => (window.location.href = link.href)}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>

            <IconButton
              color="inherit"
              edge="end"
              sx={{ display: { md: "none" } }}
              onClick={handleDrawerToggle}
              aria-label="open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          </Container>
        </Toolbar>
      </AppBar>

      {/* Drawer Menu */}
      <Drawer anchor="right" open={mobileOpen} onClose={handleDrawerToggle}>
        <Box sx={{ width: 240, mt: 2 }}>
          <List>
            {links.map((link, idx) => (
              <ListItem button key={idx} onClick={() => (window.location.href = link.href)}>
                <ListItemText primary={link.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}

Navbar.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
    })
  ),
};

export default React.memo(Navbar);
