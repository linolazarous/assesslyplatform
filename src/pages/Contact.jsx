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
      setSnackbar({
        open: true,
        message: "Please fill in all fields before submitting.",
        severity: "warning",
      });
      return;
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
          message: "Message sent successfully! We'll get back to you soon.",
          severity: "success",
        });
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error(data?.message || "Failed to send message.");
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Something went wrong.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        py: 10,
        background: "linear-gradient(135deg, #f9f9f9, #f0f4ff)",
        minHeight: "100vh",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={4}
          sx={{
            p: 5,
            borderRadius: 4,
            backgroundColor: "background.paper",
          }}
        >
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{ fontWeight: 700 }}
          >
            Contact Us
          </Typography>
          <Typography
            variant="body1"
            align="center"
            sx={{ mb: 3, color: "text.secondary" }}
          >
            Have questions, feedback, or need help? Send us a message below.
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
              endIcon={<SendIcon />}
              sx={{
                mt: 3,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
                py: 1.2,
              }}
            >
              {loading ? "Sending..." : "Send Message"}
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
          sx={{ width: "100%" }}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
