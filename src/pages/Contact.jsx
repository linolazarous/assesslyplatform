// src/pages/Contact.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
  Paper,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";

/**
 * Contact page with animated success popup + confetti.
 * - Moves timers into useEffect to avoid leaks.
 * - Guards Confetti usage behind window check to avoid SSR errors.
 */

// Success popup (pure UI)
const SuccessPopup = React.memo(({ success }) => {
  if (!success) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 2000,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          padding: "2rem 3rem",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} transition={{ type: "spring", stiffness: 250, damping: 12 }}>
          <CheckCircleIcon sx={{ color: "#22c55e", fontSize: 80, mb: 2 }} />
        </motion.div>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Message Sent!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Thanks for reaching out — we'll get back to you shortly.
        </Typography>
      </motion.div>
    </AnimatePresence>
  );
});

// Contact form (stateless UI)
const ContactForm = React.memo(({ formData, loading, onChange, onSubmit }) => {
  return (
    <form onSubmit={onSubmit}>
      <TextField fullWidth label="Full Name" name="name" value={formData.name} onChange={onChange} variant="outlined" margin="normal" required disabled={loading} />
      <TextField fullWidth label="Email Address" name="email" value={formData.email} onChange={onChange} variant="outlined" margin="normal" required type="email" disabled={loading} />
      <TextField fullWidth label="Your Message" name="message" value={formData.message} onChange={onChange} variant="outlined" margin="normal" required multiline rows={5} disabled={loading} />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        size="large"
        disabled={loading}
        endIcon={!loading && <SendIcon />}
        sx={{
          mt: 3,
          py: 1.3,
          borderRadius: 3,
          fontWeight: 700,
          textTransform: "none",
          background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
          "&:hover": {
            background: "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
          },
          "&:disabled": {
            background: "rgba(0, 0, 0, 0.12)",
          },
        }}
      >
        {loading ? <CircularProgress size={26} sx={{ color: "white" }} /> : "Send Message"}
      </Button>
    </form>
  );
});

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Basic validation
      if (!formData.name?.trim() || !formData.email?.trim() || !formData.message?.trim()) {
        setSnackbar({ open: true, message: "Please fill in all fields before submitting.", severity: "warning" });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setSnackbar({ open: true, message: "Please enter a valid email address.", severity: "warning" });
        return;
      }

      try {
        setLoading(true);

        // Use relative URL if same origin; fallback to full URL if needed
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            message: formData.message.trim(),
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setSuccess(true);
          setSnackbar({ open: true, message: "✅ Message sent successfully! We'll get back to you soon.", severity: "success" });
          setFormData({ name: "", email: "", message: "" });
        } else {
          throw new Error(data?.message || "Failed to send message.");
        }
      } catch (err) {
        console.error("Contact form error:", err);
        setSnackbar({ open: true, message: err.message || "Network error. Please try again.", severity: "error" });
      } finally {
        setLoading(false);
      }
    },
    [formData]
  );

  // Auto-hide success popup after 5s (cleaned up)
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 5000);
    return () => clearTimeout(timer);
  }, [success]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // Memoize background style to avoid re-creating
  const backgroundStyle = useMemo(
    () => ({
      py: { xs: 6, md: 10 },
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8faff 0%, #e0e7ff 50%, #eef2ff 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }),
    []
  );

  return (
    <Box sx={backgroundStyle}>
      {/* Confetti only in browser and only when success */}
      {typeof window !== "undefined" && success && <Confetti recycle={false} numberOfPieces={200} gravity={0.3} />}

      <Container maxWidth="sm">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Paper
            elevation={10}
            sx={{
              p: { xs: 4, sm: 5 },
              borderRadius: 4,
              backdropFilter: "blur(15px)",
              background: "rgba(255,255,255,0.75)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 800, color: "primary.main", letterSpacing: "-0.5px" }}>
              Get in Touch
            </Typography>

            <Typography variant="body1" align="center" sx={{ mb: 3, color: "text.secondary" }}>
              We'd love to hear from you. Fill out the form below and we'll reply soon.
            </Typography>

            <ContactForm formData={formData} loading={loading} onChange={handleChange} onSubmit={handleSubmit} />
          </Paper>
        </motion.div>
      </Container>

      {/* Success Popup */}
      <SuccessPopup success={success} />

      {/* Snackbar Notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snackbar.severity} sx={{ width: "100%", fontWeight: 500 }} onClose={handleSnackbarClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
