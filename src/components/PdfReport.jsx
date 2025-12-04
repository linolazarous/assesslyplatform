// src/components/PdfReport.jsx
import React, { useState, useCallback, useMemo } from "react";
import {
  Button,
  CircularProgress,
  Box,
  Alert,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  TextField,
  Stack,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  Grid,
  Paper,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  PictureAsPdf,
  ErrorOutline,
  Download,
  Print,
  Share,
  CloudDownload,
  Email,
  InsertDriveFile,
  Description,
  Assessment as AssessmentIcon,
  BarChart,
  People,
  Timer,
  CalendarToday,
  TrendingUp,
  TrendingDown,
  MoreVert,
  Settings,
  Image,
  TableChart,
  PieChart,
  GridView,
  ViewList,
  ContentCopy,
  Visibility,
  Archive,
  Star,
  StarBorder,
  Code, // Added missing icon
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";

const REPORT_TYPES = {
  detailed: { label: "Detailed Report", icon: <Description /> },
  summary: { label: "Summary Report", icon: <BarChart /> },
  questions: { label: "Questions Only", icon: <ViewList /> },
  answers: { label: "Answers Only", icon: <InsertDriveFile /> },
  comparative: { label: "Comparative Report", icon: <TrendingUp /> },
};

const EXPORT_FORMATS = {
  pdf: { label: "PDF", icon: <PictureAsPdf />, color: "error" },
  excel: { label: "Excel", icon: <TableChart />, color: "success" },
  csv: { label: "CSV", icon: <GridView />, color: "primary" },
  json: { label: "JSON", icon: <Code />, color: "warning" },
};

export default function PdfReport({
  assessment = null,
  answers = {},
  responses = [],
  candidates = [],
  showAdvancedOptions = true,
  showPreview = false,
  autoGenerate = false,
  onExportComplete = null,
  size = "medium",
  variant = "contained",
  fullWidth = false,
  sx = {},
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { currentOrganization, isSuperAdmin } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [reportType, setReportType] = useState("detailed");
  const [exportFormat, setExportFormat] = useState("pdf");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeComments, setIncludeComments] = useState(false);
  const [includeOrganizationLogo, setIncludeOrganizationLogo] = useState(true);
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [quality, setQuality] = useState("high");
  const [anchorEl, setAnchorEl] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Auto-generate on mount if enabled
  React.useEffect(() => {
    if (autoGenerate && assessment && !loading) {
      handleGenerateReport();
    }
  }, [autoGenerate, assessment]);

  // Report statistics
  const reportStats = useMemo(() => {
    if (!assessment || !assessment.questions) {
      return null;
    }
    
    const totalQuestions = assessment.questions.length;
    const totalResponses = Array.isArray(responses) ? responses.length : 0;
    const answeredQuestions = assessment.questions.filter((q, index) => {
      return answers[index] !== undefined && answers[index] !== null && answers[index] !== "";
    }).length;
    
    let averageScore = 0;
    if (responses.length > 0) {
      const scores = responses.map(r => r.score || 0).filter(s => s > 0);
      averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    
    return {
      totalQuestions,
      answeredQuestions,
      totalResponses,
      averageScore,
      completionRate: (answeredQuestions / totalQuestions) * 100,
    };
  }, [assessment, answers, responses]);

  // Generate report
  const handleGenerateReport = useCallback(async (format = exportFormat) => {
    if (!assessment) {
      setError("No assessment data available");
      enqueueSnackbar("Please provide assessment data", { variant: "warning" });
      return;
    }

    setGenerating(true);
    setError(null);
    setGenerationProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      let result;
      
      switch (format) {
        case "pdf":
          result = await generatePdfReport();
          break;
        case "excel":
          result = await generateExcelReport();
          break;
        case "csv":
          result = await generateCsvReport();
          break;
        case "json":
          result = await generateJsonReport();
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Download the file
      downloadFile(result, format);

      // Notify success
      enqueueSnackbar(`${REPORT_TYPES[reportType]?.label} exported successfully as ${format.toUpperCase()}`, {
        variant: "success",
        autoHideDuration: 3000,
      });

      // Callback
      if (onExportComplete) {
        onExportComplete({ format, type: reportType, fileName: result.fileName });
      }

    } catch (err) {
      console.error("Report generation failed:", err);
      setError(err.message || "Failed to generate report");
      enqueueSnackbar(`Failed to generate report: ${err.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
    } finally {
      setGenerating(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  }, [assessment, reportType, exportFormat, answers, responses, enqueueSnackbar, onExportComplete]);

  const generatePdfReport = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = await import("jspdf-autotable");
      
      const doc = new jsPDF({
        orientation,
        unit: "mm",
        format: pageSize,
        compress: quality === "high",
      });

      // Add organization logo if enabled
      let startY = 20;
      if (includeOrganizationLogo && currentOrganization?.logo) {
        try {
          // In a real app, you would fetch and add the logo
          // For now, we'll add a placeholder
          doc.setFillColor(40, 53, 147);
          doc.rect(15, 15, 30, 10, "F");
          doc.setTextColor(255);
          doc.setFontSize(8);
          doc.text("LOGO", 30, 21, { align: "center" });
          startY = 30;
        } catch (error) {
          console.warn("Could not add organization logo:", error);
        }
      }

      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 53, 147);
      doc.text(assessment.title, doc.internal.pageSize.width / 2, startY, { align: "center" });
      
      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`${REPORT_TYPES[reportType]?.label}`, doc.internal.pageSize.width / 2, startY + 8, { align: "center" });

      // Metadata
      doc.setFontSize(9);
      doc.setTextColor(150);
      let metadataY = startY + 16;
      
      doc.text(`Organization: ${currentOrganization?.name || "N/A"}`, 15, metadataY);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, doc.internal.pageSize.width - 15, metadataY, { align: "right" });
      metadataY += 6;
      
      if (reportStats) {
        doc.text(`Questions: ${reportStats.answeredQuestions}/${reportStats.totalQuestions}`, 15, metadataY);
        doc.text(`Score: ${reportStats.averageScore.toFixed(1)}%`, doc.internal.pageSize.width - 15, metadataY, { align: "right" });
      }

      // Generate content based on report type
      let currentY = metadataY + 10;
      
      switch (reportType) {
        case "summary":
          currentY = await generateSummaryReport(doc, autoTable, currentY);
          break;
        case "questions":
          currentY = await generateQuestionsReport(doc, autoTable, currentY);
          break;
        case "answers":
          currentY = await generateAnswersReport(doc, autoTable, currentY);
          break;
        case "comparative":
          currentY = await generateComparativeReport(doc, autoTable, currentY);
          break;
        default: // detailed
          currentY = await generateDetailedReport(doc, autoTable, currentY);
      }

      // Add comments if enabled and available
      if (includeComments && assessment.comments) {
        currentY = addCommentsSection(doc, currentY);
      }

      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${totalPages} • ${currentOrganization?.name || "Assessly"} • Confidential`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }

      // Apply password protection if enabled
      if (passwordProtected && password) {
        doc.setPermissions({
          annotations: false,
          fillForms: false,
          copy: false,
          printLowQuality: false,
          print: false,
          modify: false,
        });
      }

      const fileName = `${assessment.title.replace(/[^a-z0-9]/gi, "_")}_${reportType}_${new Date().toISOString().split("T")[0]}.pdf`;
      
      return { doc, fileName };
    } catch (error) {
      console.error("PDF generation error:", error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  };

  const generateExcelReport = async () => {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      
      // Create worksheets
      const summaryData = generateExcelSummaryData();
      const questionsData = generateExcelQuestionsData();
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      const questionsSheet = XLSX.utils.aoa_to_sheet(questionsData);
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, questionsSheet, "Questions");
      
      const fileName = `${assessment.title.replace(/[^a-z0-9]/gi, "_")}_${reportType}_${new Date().toISOString().split("T")[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      
      return { data: excelBuffer, fileName, type: "excel" };
    } catch (error) {
      console.error("Excel generation error:", error);
      throw new Error(`Failed to generate Excel: ${error.message}`);
    }
  };

  const generateCsvReport = async () => {
    try {
      const csvContent = generateCsvContent();
      const fileName = `${assessment.title.replace(/[^a-z0-9]/gi, "_")}_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
      
      return { data: csvContent, fileName, type: "csv" };
    } catch (error) {
      console.error("CSV generation error:", error);
      throw new Error(`Failed to generate CSV: ${error.message}`);
    }
  };

  const generateJsonReport = async () => {
    try {
      const jsonData = {
        assessment,
        answers,
        responses,
        stats: reportStats,
        generatedAt: new Date().toISOString(),
        generatedBy: currentOrganization?.name,
      };
      
      const fileName = `${assessment.title.replace(/[^a-z0-9]/gi, "_")}_${reportType}_${new Date().toISOString().split("T")[0]}.json`;
      
      return { data: JSON.stringify(jsonData, null, 2), fileName, type: "json" };
    } catch (error) {
      console.error("JSON generation error:", error);
      throw new Error(`Failed to generate JSON: ${error.message}`);
    }
  };

  // Helper functions for PDF generation
  const generateDetailedReport = async (doc, autoTable, startY) => {
    const tableData = assessment.questions.map((q, i) => {
      const answer = getAnswerForQuestion(i);
      const correctAnswer = q.type === "multiple_choice" 
        ? q.options?.find(opt => opt.isCorrect)?.text 
        : null;
      
      return [
        `Q${i+1}`,
        q.text.substring(0, 100) + (q.text.length > 100 ? "..." : ""),
        formatAnswer(answer),
        correctAnswer || "N/A",
        q.points || 1,
        answer === correctAnswer ? "✓" : "✗",
      ];
    });

    autoTable.default(doc, {
      startY,
      head: [["#", "Question", "Answer", "Correct", "Points", "Result"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15, halign: "center" },
      },
      styles: { fontSize: 9, cellPadding: 2 },
    });

    return doc.lastAutoTable.finalY + 10;
  };

  const generateSummaryReport = async (doc, autoTable, startY) => {
    doc.setFontSize(14);
    doc.setTextColor(60);
    doc.text("Assessment Summary", 15, startY);
    
    const summaryY = startY + 10;
    
    const summaryData = [
      ["Total Questions", reportStats.totalQuestions],
      ["Answered", reportStats.answeredQuestions],
      ["Completion Rate", `${reportStats.completionRate.toFixed(1)}%`],
      ["Average Score", `${reportStats.averageScore.toFixed(1)}%`],
      ["Total Responses", reportStats.totalResponses],
    ];

    autoTable.default(doc, {
      startY: summaryY,
      body: summaryData,
      theme: "plain",
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 60 },
        1: { cellWidth: 40, halign: "right" },
      },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    return doc.lastAutoTable.finalY + 10;
  };

  const generateQuestionsReport = async (doc, autoTable, startY) => {
    const questionsData = assessment.questions.map((q, i) => [
      `Q${i+1}`,
      q.text,
      q.type,
      q.required ? "Required" : "Optional",
      q.points || 1,
    ]);

    autoTable.default(doc, {
      startY,
      head: [["#", "Question", "Type", "Required", "Points"]],
      body: questionsData,
      theme: "grid",
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      columnStyles: {
        1: { cellWidth: 120 },
      },
      styles: { fontSize: 9, cellPadding: 2 },
    });

    return doc.lastAutoTable.finalY + 10;
  };

  const generateAnswersReport = async (doc, autoTable, startY) => {
    const answersData = assessment.questions.map((q, i) => {
      const answer = getAnswerForQuestion(i);
      return [
        `Q${i+1}`,
        formatAnswer(answer),
      ];
    });

    autoTable.default(doc, {
      startY,
      head: [["Question", "Answer"]],
      body: answersData,
      theme: "plain",
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 140 },
      },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    return doc.lastAutoTable.finalY + 10;
  };

  const generateComparativeReport = async (doc, autoTable, startY) => {
    if (!candidates || candidates.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(150);
      doc.text("No comparative data available", 15, startY);
      return startY + 10;
    }

    // Create table for comparative analysis
    const candidateData = candidates.map(candidate => {
      const candidateResponses = responses.filter(r => r.candidateId === candidate.id);
      const totalScore = candidateResponses.reduce((sum, r) => sum + (r.score || 0), 0);
      const avgScore = candidateResponses.length > 0 ? totalScore / candidateResponses.length : 0;
      
      return [
        candidate.name || `Candidate ${candidate.id}`,
        candidateResponses.length,
        `${avgScore.toFixed(1)}%`,
        new Date(candidate.completedAt || Date.now()).toLocaleDateString(),
      ];
    });

    autoTable.default(doc, {
      startY,
      head: [["Candidate", "Responses", "Avg Score", "Completed"]],
      body: candidateData,
      theme: "striped",
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
    });

    return doc.lastAutoTable.finalY + 10;
  };

  const addCommentsSection = (doc, startY) => {
    if (!assessment.comments) return startY;
    
    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text("Comments", 15, startY);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const splitComments = doc.splitTextToSize(assessment.comments, 180);
    doc.text(splitComments, 15, startY + 8);
    
    return startY + 8 + (splitComments.length * 5);
  };

  // Helper functions
  const getAnswerForQuestion = (index) => {
    if (Array.isArray(answers) && answers[index] !== undefined) {
      return answers[index];
    } else if (Array.isArray(responses) && responses[index]?.answer !== undefined) {
      return responses[index].answer;
    } else if (answers?.[index] !== undefined) {
      return answers[index];
    }
    return null;
  };

  const formatAnswer = (answer) => {
    if (answer === null || answer === undefined) return "N/A";
    if (Array.isArray(answer)) return answer.join(", ");
    return String(answer);
  };

  const generateExcelSummaryData = () => {
    return [
      ["Assessment Summary", ""],
      ["Title", assessment.title],
      ["Organization", currentOrganization?.name || "N/A"],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Statistics", ""],
      ["Total Questions", reportStats.totalQuestions],
      ["Answered Questions", reportStats.answeredQuestions],
      ["Completion Rate", `${reportStats.completionRate.toFixed(1)}%`],
      ["Average Score", `${reportStats.averageScore.toFixed(1)}%`],
    ];
  };

  const generateExcelQuestionsData = () => {
    const headers = ["#", "Question", "Type", "Required", "Points", "Answer", "Correct Answer", "Result"];
    const data = [headers];
    
    assessment.questions.forEach((q, i) => {
      const answer = getAnswerForQuestion(i);
      const correctAnswer = q.type === "multiple_choice" 
        ? q.options?.find(opt => opt.isCorrect)?.text 
        : null;
      
      data.push([
        i + 1,
        q.text,
        q.type,
        q.required ? "Yes" : "No",
        q.points || 1,
        formatAnswer(answer),
        correctAnswer || "N/A",
        answer === correctAnswer ? "Correct" : "Incorrect",
      ]);
    });
    
    return data;
  };

  const generateCsvContent = () => {
    const headers = ["Question Number", "Question Text", "Answer", "Correct Answer", "Points", "Result"];
    const rows = assessment.questions.map((q, i) => {
      const answer = getAnswerForQuestion(i);
      const correctAnswer = q.type === "multiple_choice" 
        ? q.options?.find(opt => opt.isCorrect)?.text 
        : null;
      
      return [
        i + 1,
        `"${q.text.replace(/"/g, '""')}"`,
        `"${formatAnswer(answer).replace(/"/g, '""')}"`,
        `"${(correctAnswer || "N/A").replace(/"/g, '""')}"`,
        q.points || 1,
        answer === correctAnswer ? "Correct" : "Incorrect",
      ].join(",");
    });
    
    return [headers.join(","), ...rows].join("\n");
  };

  const downloadFile = (result, format) => {
    const blob = new Blob(
      [format === "pdf" ? result.doc.output("blob") : result.data],
      { type: getMimeType(format) }
    );
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getMimeType = (format) => {
    switch (format) {
      case "pdf": return "application/pdf";
      case "excel": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "csv": return "text/csv";
      case "json": return "application/json";
      default: return "application/octet-stream";
    }
  };

  const handleQuickExport = (format) => {
    setExportFormat(format);
    handleGenerateReport(format);
  };

  const renderExportButton = () => {
    const config = EXPORT_FORMATS[exportFormat] || EXPORT_FORMATS.pdf;
    
    return (
      <Button
        variant={variant}
        color={config.color}
        onClick={() => handleGenerateReport()}
        disabled={!assessment || generating}
        startIcon={generating ? <CircularProgress size={20} /> : config.icon}
        size={size}
        fullWidth={fullWidth}
        sx={{ minWidth: 180, ...sx }}
      >
        {generating ? `Generating ${config.label}...` : `Export as ${config.label}`}
      </Button>
    );
  };

  const renderAdvancedOptions = () => (
    <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Export Settings
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              label="Report Type"
              onChange={(e) => setReportType(e.target.value)}
            >
              {Object.entries(REPORT_TYPES).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {value.icon}
                    <Typography>{value.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value)}
            >
              {Object.entries(EXPORT_FORMATS).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {value.icon}
                    <Typography>{value.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  size="small"
                />
              }
              label="Include Charts"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  size="small"
                />
              }
              label="Include Comments"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeOrganizationLogo}
                  onChange={(e) => setIncludeOrganizationLogo(e.target.checked)}
                  size="small"
                />
              }
              label="Include Logo"
            />
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );

  if (!assessment) {
    return (
      <Alert severity="warning" sx={{ maxWidth: 400 }}>
        <Typography variant="body2">
          No assessment data available for report generation.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Main Export Button with Progress */}
      <Box sx={{ position: "relative" }}>
        {renderExportButton()}
        
        {generating && (
          <LinearProgress
            variant="determinate"
            value={generationProgress}
            sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3 }}
          />
        )}
      </Box>

      {/* Quick Export Actions */}
      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
        {Object.entries(EXPORT_FORMATS).map(([key, value]) => (
          <Tooltip key={key} title={`Export as ${value.label}`}>
            <IconButton
              size="small"
              onClick={() => handleQuickExport(key)}
              disabled={!assessment || generating}
              color={value.color}
            >
              {value.icon}
            </IconButton>
          </Tooltip>
        ))}
        
        <Tooltip title="More options">
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            disabled={!assessment}
          >
            <MoreVert />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Advanced Options */}
      {showAdvancedOptions && renderAdvancedOptions()}

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          icon={<ErrorOutline />}
          onClose={() => setError(null)}
          sx={{ mt: 2, maxWidth: 400 }}
        >
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}

      {/* More Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => { setPreviewDialogOpen(true); setAnchorEl(null); }}>
          <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
          <ListItemText>Preview Report</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setSettingsDialogOpen(true); setAnchorEl(null); }}>
          <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
          <ListItemText>Advanced Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigator.clipboard.writeText(JSON.stringify(assessment)); setAnchorEl(null); }}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText>Copy Assessment Data</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { /* Print functionality */ setAnchorEl(null); }}>
          <ListItemIcon><Print fontSize="small" /></ListItemIcon>
          <ListItemText>Print</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { /* Email functionality */ setAnchorEl(null); }}>
          <ListItemIcon><Email fontSize="small" /></ListItemIcon>
          <ListItemText>Email Report</ListItemText>
        </MenuItem>
      </Menu>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Report Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, border: "1px dashed", borderColor: "divider", borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>{assessment.title}</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {REPORT_TYPES[reportType]?.label} Preview
            </Typography>
            
            {reportStats && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", p: 2 }}>
                      <Typography variant="h6">{reportStats.totalQuestions}</Typography>
                      <Typography variant="caption">Questions</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", p: 2 }}>
                      <Typography variant="h6">{reportStats.answeredQuestions}</Typography>
                      <Typography variant="caption">Answered</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", p: 2 }}>
                      <Typography variant="h6">{reportStats.averageScore.toFixed(1)}%</Typography>
                      <Typography variant="caption">Avg Score</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: "center", p: 2 }}>
                      <Typography variant="h6">{reportStats.totalResponses}</Typography>
                      <Typography variant="caption">Responses</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
            
            {/* Sample table preview */}
            <Typography variant="subtitle2" gutterBottom>Sample Questions</Typography>
            <Paper elevation={0} sx={{ bgcolor: "background.default", p: 1 }}>
              {assessment.questions.slice(0, 3).map((q, i) => (
                <Box key={i} sx={{ mb: 1, p: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography variant="body2">
                    <strong>Q{i+1}:</strong> {q.text.substring(0, 80)}...
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Answer: {formatAnswer(getAnswerForQuestion(i))}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setPreviewDialogOpen(false);
              handleGenerateReport();
            }}
          >
            Generate Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Page Size</InputLabel>
              <Select
                value={pageSize}
                label="Page Size"
                onChange={(e) => setPageSize(e.target.value)}
              >
                <MenuItem value="a4">A4</MenuItem>
                <MenuItem value="letter">Letter</MenuItem>
                <MenuItem value="legal">Legal</MenuItem>
                <MenuItem value="a3">A3</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Orientation</InputLabel>
              <Select
                value={orientation}
                label="Orientation"
                onChange={(e) => setOrientation(e.target.value)}
              >
                <MenuItem value="portrait">Portrait</MenuItem>
                <MenuItem value="landscape">Landscape</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Quality</InputLabel>
              <Select
                value={quality}
                label="Quality"
                onChange={(e) => setQuality(e.target.value)}
              >
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={passwordProtected}
                  onChange={(e) => setPasswordProtected(e.target.checked)}
                />
              }
              label="Password Protect PDF"
            />
            
            {passwordProtected && (
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                size="small"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setSettingsDialogOpen(false);
              enqueueSnackbar("Settings saved", { variant: "success" });
            }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

PdfReport.propTypes = {
  assessment: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    questions: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        type: PropTypes.string,
        options: PropTypes.array,
        required: PropTypes.bool,
        points: PropTypes.number,
      })
    ).isRequired,
    comments: PropTypes.string,
  }),
  answers: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]),
  responses: PropTypes.arrayOf(
    PropTypes.shape({
      answer: PropTypes.any,
      score: PropTypes.number,
      candidateId: PropTypes.string,
      completedAt: PropTypes.string,
    })
  ),
  candidates: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    })
  ),
  showAdvancedOptions: PropTypes.bool,
  showPreview: PropTypes.bool,
  autoGenerate: PropTypes.bool,
  onExportComplete: PropTypes.func,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  variant: PropTypes.oneOf(["text", "outlined", "contained"]),
  fullWidth: PropTypes.bool,
  sx: PropTypes.object,
};

PdfReport.defaultProps = {
  assessment: null,
  answers: {},
  responses: [],
  candidates: [],
  showAdvancedOptions: true,
  showPreview: false,
  autoGenerate: false,
  onExportComplete: null,
  size: "medium",
  variant: "contained",
  fullWidth: false,
  sx: {},
};

export const MemoizedPdfReport = React.memo(PdfReport);
