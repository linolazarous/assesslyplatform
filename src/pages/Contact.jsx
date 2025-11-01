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

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
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
      const res = await fetch(
        "https://assesslyplatform-t49h.onrender.com/api/contact",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setSnackbar({
          open: true,
          message: "✅ Message sent successfully! We’ll get back to you soon.",
          severity: "success",
        });
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error(data?.message || "Failed to send message.");
      }
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
        background: "linear-gradient(145deg, #eef2ff 0%, #f9fafb 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: { xs: 4, sm: 5 },
            borderRadius: 4,
            backgroundColor: "background.paper",
            boxShadow: "0px 8px 24px rgba(0,0,0,0.05)",
          }}
        >
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{ fontWeight: 700, color: "primary.main" }}
          >
            Contact Us
          </Typography>

          <Typography
            variant="body1"
            align="center"
            sx={{ mb: 3, color: "text.secondary" }}
          >
            Have a question, suggestion, or need support?  
            We’d love to hear from you.
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
              autoComplete="name"
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
              autoComplete="email"
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
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
                py: 1.4,
              }}
            >
              {loading ? (
                <CircularProgress
                  size={26}
                  sx={{ color: "white" }}
                  thickness={5}
                />
              ) : (
                "Send Message"
              )}
            </Button>
          </form>
        </Paper>
      </Container>

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
