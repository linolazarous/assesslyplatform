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
  Divider,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import Logo from "../brand/Logo.jsx"; // ✅ Correct, case-sensitive import

/**
 * Navbar Component
 * - Responsive top navigation bar with logo, title, and links
 * - Drawer menu on mobile for clean UX
 * - Styled consistently with MUI theming and Sidebar
 */
function Navbar({ links = [] }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  const handleNavigate = (href) => {
    if (href.startsWith("http")) {
      window.open(href, "_blank");
    } else {
      window.location.href = href;
    }
  };

  const drawerContent = (
    <Box sx={{ width: 260 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Logo size={36} />
        <Typography variant="h6" fontWeight={600}>
          Assessly
        </Typography>
      </Box>

      <List>
        {links.map((link, idx) => (
          <ListItem
            key={idx}
            onClick={() => {
              handleNavigate(link.href);
              setMobileOpen(false);
            }}
            sx={{
              cursor: "pointer",
              "&:hover": { backgroundColor: "action.hover" },
            }}
          >
            <ListItemText
              primary={link.label}
              primaryTypographyProps={{
                fontSize: 15,
                fontWeight: 500,
              }}
            />
          </ListItem>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 2, textAlign: "center", color: "text.secondary", fontSize: 13 }}>
        © {new Date().getFullYear()} Assessly
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={1}
        sx={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255,255,255,0.8)",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <Toolbar disableGutters>
          <Container
            maxWidth="xl"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 0.5,
            }}
          >
            {/* Left Section — Logo + Title */}
            <Box
              display="flex"
              alignItems="center"
              gap={1.2}
              sx={{ cursor: "pointer" }}
              onClick={() => handleNavigate("/")}
            >
              <Logo size={34} />
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ userSelect: "none", letterSpacing: 0.3 }}
              >
                Assessly
              </Typography>
            </Box>

            {/* Center Links (Desktop only) */}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 3 }}>
              {links.map((link, idx) => (
                <Typography
                  key={idx}
                  variant="body2"
                  onClick={() => handleNavigate(link.href)}
                  sx={{
                    cursor: "pointer",
                    fontWeight: 500,
                    color: "text.primary",
                    transition: "color 0.2s",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>

            {/* Mobile Menu Icon */}
            <IconButton
              color="inherit"
              edge="end"
              onClick={handleDrawerToggle}
              sx={{ display: { md: "none" } }}
              aria-label="open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          </Container>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 260,
          },
        }}
      >
        {drawerContent}
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
