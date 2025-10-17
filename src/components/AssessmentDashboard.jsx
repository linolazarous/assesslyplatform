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
  Badge,
} from "@mui/material";
import { CheckCircle, HourglassEmpty, DoneAll } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";

// ✅ Fixed: Added proper icons to config map
const statusConfig = {
  active: { color: "success", icon: <CheckCircle /> },
  in_progress: { color: "warning", icon: <HourglassEmpty /> },
  completed: { color: "primary", icon: <DoneAll /> },
};

export default function AssessmentDashboard() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const { enqueueSnackbar } = useSnackbar();

  // ✅ UseCallback with dependencies for safe fetch on tab change
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const response = await fetch(`/api/assessments?status=${activeTab}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch assessments");
      }

      setAssessments(Array.isArray(data.assessments) ? data.assessments : data);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      enqueueSnackbar(`Failed to load assessments: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, enqueueSnackbar]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleStartAssessment = async (assessmentId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const response = await fetch(`/api/assessments/${assessmentId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to start assessment");
      }

      enqueueSnackbar("Assessment started successfully", { variant: "success" });
      fetchAssessments();
    } catch (err) {
      console.error("Error starting assessment:", err);
      enqueueSnackbar(`Failed to start assessment: ${err.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          Assessment Dashboard
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          {Object.keys(statusConfig).map((tab) => (
            <Chip
              key={tab}
              label={tab.replace("_", " ")}
              onClick={() => {
                setActiveTab(tab);
                setPage(0);
              }}
              color={activeTab === tab ? "primary" : "default"}
              variant={activeTab === tab ? "filled" : "outlined"}
              sx={{ textTransform: "capitalize" }}
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
          No {activeTab.replace("_", " ")} assessments found.
        </Typography>
      ) : (
        <>
          <List sx={{ mb: 2 }}>
            {assessments
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((assessment) => {
                const config =
                  statusConfig[assessment.status] || statusConfig.active;
                return (
                  <ListItem
                    key={assessment.id}
                    divider
                    secondaryAction={
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={config.icon}
                        onClick={() => handleStartAssessment(assessment.id)}
                        disabled={assessment.status === "completed"}
                        sx={{ textTransform: "capitalize" }}
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
                          <Badge color={config.color} variant="dot" overlap="circular">
                            <Typography fontWeight="medium">
                              {assessment.title}
                            </Typography>
                          </Badge>
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography
                            variant="body2"
                            component="span"
                            display="block"
                          >
                            Created:{" "}
                            {new Date(assessment.createdAt).toLocaleDateString()}
                          </Typography>
                          {assessment.dueDate && (
                            <Typography
                              variant="body2"
                              component="span"
                              display="block"
                            >
                              Due:{" "}
                              {new Date(assessment.dueDate).toLocaleString()}
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
