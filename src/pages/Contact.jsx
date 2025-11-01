import React, { useState } from "react";
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

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      return setSnackbar({
        open: true,
        message: "Please fill in all fields before submitting.",
        severity: "warning",
      });
    }

    try {
      setLoading(true);
      const res = await fetch("https://assesslyplatform-t49h.onrender.com/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setSnackbar({
          open: true,
          message: "✅ Message sent successfully! We'll get back to you soon.",
          severity: "success",
        });
        setFormData({ name: "", email: "", message: "" });

        // Stop success animation after 5s
        setTimeout(() => setSuccess(false), 5000);
      } else throw new Error(data?.message || "Failed to send message.");
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Something went wrong. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        py: { xs: 6, md: 10 },
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8faff 0%, #e0e7ff 50%, #eef2ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 🎉 Confetti on success */}
      <AnimatePresence>{success && <Confetti recycle={false} gravity={0.3} />}</AnimatePresence>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={10}
            sx={{
              p: { xs: 4, sm: 5 },
              borderRadius: 4,
              backdropFilter: "blur(15px)",
              background:
                "rgba(255,255,255,0.75) linear-gradient(145deg, rgba(255,255,255,0.3), rgba(245,247,255,0.4))",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          >
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{
                fontWeight: 800,
                color: "primary.main",
                letterSpacing: "-0.5px",
              }}
            >
              Get in Touch
            </Typography>
            <Typography
              variant="body1"
              align="center"
              sx={{ mb: 3, color: "text.secondary" }}
            >
              We'd love to hear from you. Fill out the form below and we’ll reply soon.
            </Typography>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                variant="outlined"
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                margin="normal"
                required
                type="email"
              />
              <TextField
                fullWidth
                label="Your Message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                variant="outlined"
                margin="normal"
                required
                multiline
                rows={5}
              />

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
                  background:
                    "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)",
                  },
                }}
              >
                {loading ? (
                  <CircularProgress size={26} sx={{ color: "white" }} />
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>
          </Paper>
        </motion.div>
      </Container>

      {/* ✅ Success Popup Animation */}
      <AnimatePresence>
        {success && (
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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1.2 }}
              transition={{ type: "spring", stiffness: 250, damping: 12 }}
            >
              <CheckCircleIcon
                sx={{ color: "#22c55e", fontSize: 80, mb: 2 }}
              />
            </motion.div>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Message Sent!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Thanks for reaching out — we’ll get back to you shortly.
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          sx={{ width: "100%", fontWeight: 500 }}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
