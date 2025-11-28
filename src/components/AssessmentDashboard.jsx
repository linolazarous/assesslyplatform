import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  CircularProgress,
  Box,
  TablePagination,
} from "@mui/material";
import { CheckCircle, HourglassEmpty, DoneAll } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";

// ✅ Fixed: Added proper icons to config map
const statusConfig = {
  active: { color: "success", icon: <CheckCircle />, label: "Active" },
  in_progress: { color: "warning", icon: <HourglassEmpty />, label: "In Progress" },
  completed: { color: "primary", icon: <DoneAll />, label: "Completed" },
};

export default function AssessmentDashboard() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // ✅ Fixed: Use correct API base URL from environment
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com';

  // ✅ Fixed: UseCallback with proper API URL
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      // ✅ Fixed: Use full API URL
      const response = await fetch(`${API_BASE_URL}/assessments?status=${activeTab}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Network error" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAssessments(Array.isArray(data.assessments) ? data.assessments : []);
      
    } catch (error) {
      console.error("Error fetching assessments:", error);
      setError(error.message);
      enqueueSnackbar(`Failed to load assessments: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, enqueueSnackbar, API_BASE_URL]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleStartAssessment = async (assessmentId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      // ✅ Fixed: Use full API URL
      const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start assessment");
      }

      enqueueSnackbar("Assessment started successfully", { variant: "success" });
      fetchAssessments(); // Refresh the list
    } catch (err) {
      console.error("Error starting assessment:", err);
      enqueueSnackbar(`Failed to start assessment: ${err.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
    }
  };

  // ✅ Fixed: Render error state
  if (error && assessments.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
        <Typography color="error" variant="h6" gutterBottom>
          Unable to Load Dashboard
        </Typography>
        <Typography color="text.secondary" paragraph>
          {error}
        </Typography>
        <Button variant="contained" onClick={fetchAssessments}>
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          Assessment Dashboard
        </Typography>

        <Box sx={{ display: "flex", gap: 1, flexWrap: 'wrap' }}>
          {Object.entries(statusConfig).map(([tab, config]) => (
            <Chip
              key={tab}
              label={config.label}
              onClick={() => {
                setActiveTab(tab);
                setPage(0);
              }}
              color={activeTab === tab ? "primary" : "default"}
              variant={activeTab === tab ? "filled" : "outlined"}
            />
          ))}
        </Box>
      </Box>

      {/* Body */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : assessments.length === 0 ? (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ p: 3, textAlign: "center" }}
        >
          No {statusConfig[activeTab]?.label?.toLowerCase() || activeTab} assessments found.
        </Typography>
      ) : (
        <>
          <List sx={{ mb: 2 }}>
            {assessments
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((assessment) => {
                const config = statusConfig[assessment.status] || statusConfig.active;
                return (
                  <ListItem
                    key={assessment.id || assessment._id}
                    divider
                    secondaryAction={
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={config.icon}
                        onClick={() => handleStartAssessment(assessment.id || assessment._id)}
                        disabled={assessment.status === "completed"}
                      >
                        {assessment.status === "active"
                          ? "Start"
                          : assessment.status === "in_progress"
                          ? "Continue"
                          : "Completed"}
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography fontWeight="medium">
                            {assessment.title || "Untitled Assessment"}
                          </Typography>
                          <Chip 
                            icon={config.icon} 
                            label={config.label}
                            color={config.color}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span" display="block">
                            Created: {new Date(assessment.createdAt).toLocaleDateString()}
                          </Typography>
                          {assessment.dueDate && (
                            <Typography variant="body2" component="span" display="block">
                              Due: {new Date(assessment.dueDate).toLocaleString()}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                );
              })}
          </List>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={assessments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </>
      )}
    </Paper>
  );
}

AssessmentDashboard.propTypes = {
  // no props yet, reserved for parent component usage
};

