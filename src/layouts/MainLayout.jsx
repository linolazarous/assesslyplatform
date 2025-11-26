import React, { useState, useEffect, useRef, useCallback } from "react";
import { Box, CssBaseline, Toolbar } from "@mui/material";
import PropTypes from "prop-types";
import Navbar from "../components/common/Navbar.jsx";
import Sidebar from "../components/common/Sidebar.jsx";
import { useAuth } from "../contexts/AuthContext";

/* -------------------------
   Drawer width
   ------------------------- */
const drawerWidth = 240;

/* -------------------------
   Helper: setInert (works with or without native inert)
   - If browser supports element.inert, use that
   - Otherwise remove tabindex from focusable elements and set aria-hidden
   - This prevents focus leaks and avoids the "aria-hidden on focused element" warning
   ------------------------- */
function setInertOn(rootEl, inert) {
  if (!rootEl) return;
  // native support
  if ("inert" in rootEl) {
    try {
      rootEl.inert = inert;
      return;
    } catch {}
  }

  // fallback: toggle tabindex for focusable elements and set aria-hidden
  const FOCUSABLE_SELECTOR =
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]';
  if (inert) {
    rootEl.setAttribute("aria-hidden", "true");
    rootEl._savedTabindexes = [];
    const focusables = Array.from(rootEl.querySelectorAll(FOCUSABLE_SELECTOR));
    focusables.forEach((el) => {
      const prev = el.getAttribute("tabindex");
      rootEl._savedTabindexes.push({ el, prev });
      el.setAttribute("tabindex", "-1");
    });
  } else {
    rootEl.removeAttribute("aria-hidden");
    if (rootEl._savedTabindexes) {
      rootEl._savedTabindexes.forEach(({ el, prev }) => {
        if (prev === null) el.removeAttribute("tabindex");
        else el.setAttribute("tabindex", prev);
      });
      rootEl._savedTabindexes = null;
    }
  }
}

/* -------------------------
   MainLayout component
   ------------------------- */
export default function MainLayout({ children, darkMode, toggleDarkMode }) {
  const { currentUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSidebarVisible = !!currentUser;
  const rootRef = useRef(null);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((v) => !v);
  }, []);

  // When mobile drawer is open, make main content inert (prevent focus)
  useEffect(() => {
    const rootEl = rootRef.current || document.getElementById("root") || document.body;
    // we only inert the main app content when SIDEBAR is visible and mobile open
    const shouldInert = isSidebarVisible && mobileOpen;
    setInertOn(rootEl, shouldInert);
    // if we are opening the drawer, move focus into drawer via Sidebar's own focus trap (MUI does that)
    return () => {
      // cleanup: always remove inert on unmount/update
      setInertOn(rootEl, false);
    };
  }, [isSidebarVisible, mobileOpen]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }} ref={rootRef}>
      <CssBaseline />

      {/* Navbar */}
      <Navbar showNavigation={!isSidebarVisible} onDrawerToggle={handleDrawerToggle} darkMode={darkMode} />

      {/* Sidebar */}
      {isSidebarVisible && (
        <Sidebar
          mobileOpen={mobileOpen}
          onDrawerToggle={handleDrawerToggle}
          drawerWidth={drawerWidth}
          // Sidebar is expected to expose a focus-trap / to focus the first element
        />
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={(theme) => ({
          flexGrow: 1,
          p: 3,
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, md: isSidebarVisible ? `${drawerWidth}px` : 0 },
          pt: { xs: 8, sm: 8 },
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        })}
        aria-live="polite"
      >
        <Toolbar /> {/* keeps consistent spacing */}
        {children}
      </Box>
    </Box>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
  darkMode: PropTypes.bool,
  toggleDarkMode: PropTypes.func,
};
