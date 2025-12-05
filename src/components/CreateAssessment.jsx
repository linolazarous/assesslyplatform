// src/components/CreateAssessment.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  Divider,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Stack,
  Tooltip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  InputAdornment,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  Radio, // Added missing import
} from "@mui/material";
import {
  Add,
  Delete,
  Save,
  Close,
  CheckCircle,
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  HelpOutline,
  ContentCopy,
  Timer,
  People,
  BarChart,
  Assessment as AssessmentIcon,
  Settings,
  Visibility,
  Edit,
  Image,
  VideoLibrary,
  AttachFile,
  FormatListBulleted,
  CheckBox,
  RadioButtonChecked,
  ShortText,
  LinearScale,
  Star,
  UploadFile,
  CalendarToday,
  Lock,
  Public,
  Business,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { createAssessment } from "../api/assessmentApi"; // Fixed: removed duplicateAssessment import
import LoadingScreen from "./ui/LoadingScreen";

const QUESTION_TYPES = [
  { value: "text", label: "Text Answer", icon: <ShortText /> },
  { value: "multiple_choice", label: "Multiple Choice", icon: <RadioButtonChecked /> },
  { value: "checkbox", label: "Checkbox", icon: <CheckBox /> },
  { value: "rating", label: "Rating Scale", icon: <Star /> },
  { value: "linear_scale", label: "Linear Scale", icon: <LinearScale /> },
  { value: "dropdown", label: "Dropdown", icon: <FormatListBulleted /> },
  { value: "file", label: "File Upload", icon: <UploadFile /> },
  { value: "boolean", label: "True/False", icon: <CheckCircle /> },
];

const ASSESSMENT_TYPES = [
  { value: "quiz", label: "Quiz", icon: "❓", description: "Quick knowledge check" },
  { value: "exam", label: "Exam", icon: "📝", description: "Formal evaluation" },
  { value: "survey", label: "Survey", icon: "📊", description: "Collect feedback" },
  { value: "evaluation", label: "Evaluation", icon: "⭐", description: "Performance review" },
  { value: "certification", label: "Certification", icon: "🏆", description: "Skill validation" },
  { value: "skills", label: "Skills Assessment", icon: "🎯", description: "Competency testing" },
];

export default function CreateAssessment({ 
  organizationId = null,
  assessmentToDuplicate = null,
  onSuccess = null,
  showHeader = true,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { currentOrganization, isSuperAdmin } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [expandedQuestion, setExpandedQuestion] = useState(0);
  
  // Assessment details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assessmentType, setAssessmentType] = useState("quiz");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(60); // minutes
  const [passingScore, setPassingScore] = useState(70);
  const [isTimed, setIsTimed] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [requireLogin, setRequireLogin] = useState(true);
  const [allowRetake, setAllowRetake] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  
  // Questions
  const [questions, setQuestions] = useState([
    {
      id: Date.now(),
      text: "",
      type: "multiple_choice",
      options: [
        { id: Date.now() + 1, text: "", isCorrect: false },
        { id: Date.now() + 2, text: "", isCorrect: false },
      ],
      required: true,
      points: 1,
      explanation: "",
      tags: [],
    },
  ]);
  
  // Dialogs
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveOption, setSaveOption] = useState("publish");

  // Initialize with duplicate data if provided
  useEffect(() => {
    if (assessmentToDuplicate) {
      setTitle(`${assessmentToDuplicate.title} (Copy)`);
      setDescription(assessmentToDuplicate.description || "");
      setAssessmentType(assessmentToDuplicate.type || "quiz");
      setInstructions(assessmentToDuplicate.instructions || "");
      setDuration(assessmentToDuplicate.duration || 60);
      setPassingScore(assessmentToDuplicate.passingScore || 70);
      setIsTimed(assessmentToDuplicate.isTimed || false);
      setIsPublic(assessmentToDuplicate.isPublic || false);
      
      if (assessmentToDuplicate.questions && assessmentToDuplicate.questions.length > 0) {
        const duplicatedQuestions = assessmentToDuplicate.questions.map((q, index) => ({
          id: Date.now() + index,
          text: q.text,
          type: q.type,
          options: q.options?.map((opt, optIndex) => ({
            id: Date.now() + 1000 + optIndex,
            text: typeof opt === "string" ? opt : opt.text,
            isCorrect: opt.isCorrect || false,
          })) || [],
          required: q.required !== false,
          points: q.points || 1,
          explanation: q.explanation || "",
          tags: q.tags || [],
        }));
        setQuestions(duplicatedQuestions);
      }
      
      enqueueSnackbar("Assessment duplicated. Please review and save.", {
        variant: "info",
        autoHideDuration: 3000,
      });
    }
  }, [assessmentToDuplicate, enqueueSnackbar]);

  // Question management
  const addQuestion = useCallback(() => {
    const newQuestion = {
      id: Date.now(),
      text: "",
      type: "multiple_choice",
      options: [
        { id: Date.now() + 1, text: "", isCorrect: false },
        { id: Date.now() + 2, text: "", isCorrect: false },
      ],
      required: true,
      points: 1,
      explanation: "",
      tags: [],
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestion(questions.length);
    enqueueSnackbar("Question added", { variant: "success", autoHideDuration: 2000 });
  }, [questions, enqueueSnackbar]);

  const removeQuestion = useCallback((index) => {
    if (questions.length <= 1) {
      enqueueSnackbar("Assessment must have at least one question", { variant: "warning" });
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
    if (expandedQuestion >= index) {
      setExpandedQuestion(Math.max(0, expandedQuestion - 1));
    }
  }, [questions, expandedQuestion, enqueueSnackbar]);

  const updateQuestion = useCallback((index, field, value) => {
    const newQuestions = [...questions];
    
    if (field === "type") {
      newQuestions[index][field] = value;
      // Reset options when changing type
      if (["multiple_choice", "checkbox", "dropdown"].includes(value)) {
        if (newQuestions[index].options.length === 0) {
          newQuestions[index].options = [
            { id: Date.now() + 1, text: "", isCorrect: false },
            { id: Date.now() + 2, text: "", isCorrect: false },
          ];
        }
      } else {
        newQuestions[index].options = [];
      }
    } else {
      newQuestions[index][field] = value;
    }
    
    setQuestions(newQuestions);
  }, [questions]);

  const addOption = useCallback((qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push({
      id: Date.now(),
      text: "",
      isCorrect: false,
    });
    setQuestions(newQuestions);
  }, [questions]);

  const updateOption = useCallback((qIndex, oIndex, field, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex][field] = value;
    
    // If marking an option as correct in a single-correct question type
    if (field === "isCorrect" && value && newQuestions[qIndex].type === "multiple_choice") {
      // Uncheck all other options
      newQuestions[qIndex].options.forEach((opt, idx) => {
        if (idx !== oIndex) opt.isCorrect = false;
      });
    }
    
    setQuestions(newQuestions);
  }, [questions]);

  const removeOption = useCallback((qIndex, oIndex) => {
    const newQuestions = [...questions];
    const question = newQuestions[qIndex];
    
    if (question.options.length <= 2) {
      enqueueSnackbar("At least two options are required", { variant: "warning" });
      return;
    }
    
    question.options.splice(oIndex, 1);
    setQuestions(newQuestions);
  }, [questions, enqueueSnackbar]);

  const moveQuestion = useCallback((fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    
    const newQuestions = [...questions];
    const [movedQuestion] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedQuestion);
    setQuestions(newQuestions);
    setExpandedQuestion(toIndex);
  }, [questions]);

  // Validation
  const validateStep = useCallback((step) => {
    switch (step) {
      case 0: // Basic Info
        if (!title.trim()) {
          enqueueSnackbar("Assessment title is required", { variant: "error" });
          return false;
        }
        if (title.length < 3) {
          enqueueSnackbar("Title must be at least 3 characters", { variant: "error" });
          return false;
        }
        return true;
        
      case 1: // Questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          if (!q.text.trim()) {
            enqueueSnackbar(`Question ${i + 1} text is required`, { variant: "error" });
            return false;
          }
          
          if (["multiple_choice", "checkbox", "dropdown"].includes(q.type)) {
            if (q.options.length < 2) {
              enqueueSnackbar(`Question ${i + 1} needs at least 2 options`, { variant: "error" });
              return false;
            }
            if (q.options.some(opt => !opt.text.trim())) {
              enqueueSnackbar(`Question ${i + 1} has empty options`, { variant: "error" });
              return false;
            }
            if (q.type === "multiple_choice" && !q.options.some(opt => opt.isCorrect)) {
              enqueueSnackbar(`Question ${i + 1} needs a correct answer`, { variant: "error" });
              return false;
            }
          }
        }
        return true;
        
      default:
        return true;
    }
  }, [title, questions, enqueueSnackbar]);

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Save assessment
  const handleSave = async (status = "draft") => {
    if (!validateStep(0) || !validateStep(1)) return;
    
    setSaving(true);
    try {
      const assessmentData = {
        title: title.trim(),
        description: description.trim(),
        type: assessmentType,
        instructions: instructions.trim(),
        duration: isTimed ? duration : null,
        passingScore,
        isPublic,
        requireLogin,
        allowRetake,
        maxAttempts: allowRetake ? maxAttempts : 1,
        scheduleStart: scheduleStart || null,
        scheduleEnd: scheduleEnd || null,
        status,
        organizationId: organizationId || currentOrganization?.id,
        questions: questions.map(q => ({
          text: q.text.trim(),
          type: q.type,
          options: q.options.map(opt => ({
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
          })),
          required: q.required,
          points: q.points,
          explanation: q.explanation.trim(),
          tags: q.tags,
        })),
      };

      const result = await createAssessment(assessmentData);
      
      enqueueSnackbar(
        `Assessment ${status === "draft" ? "saved as draft" : "published successfully"}!`,
        { variant: "success" }
      );
      
      setSaveDialogOpen(false);
      
      if (onSuccess) {
        onSuccess(result);
      } else {
        navigate(`/assessments/${result.id}`);
      }
    } catch (error) {
      console.error("Error saving assessment:", error);
      enqueueSnackbar(`Failed to save assessment: ${error.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Assessment Details
            </Typography>
            
            {/* Organization context */}
            {currentOrganization && (
              <Alert 
                severity="info" 
                icon={<Business />}
                sx={{ mb: 3, maxWidth: 600 }}
              >
                <Typography variant="body2">
                  Creating assessment for <strong>{currentOrganization.name}</strong>
                </Typography>
              </Alert>
            )}
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Assessment Title"
                  fullWidth
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  helperText="Choose a clear, descriptive title for your assessment"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssessmentIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  helperText="Provide a brief overview of what this assessment covers"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Assessment Type</InputLabel>
                  <Select
                    value={assessmentType}
                    label="Assessment Type"
                    onChange={(e) => setAssessmentType(e.target.value)}
                  >
                    {ASSESSMENT_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography>{type.icon}</Typography>
                          <Box>
                            <Typography>{type.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {type.description}
                            </Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <TextField
                    label="Instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    multiline
                    rows={2}
                    helperText="Instructions for candidates taking this assessment"
                  />
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Settings
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isTimed}
                          onChange={(e) => setIsTimed(e.target.checked)}
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Timer fontSize="small" />
                          <Typography variant="body2">Timed Assessment</Typography>
                        </Stack>
                      }
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isPublic}
                          onChange={(e) => setIsPublic(e.target.checked)}
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Public fontSize="small" />
                          <Typography variant="body2">Public Access</Typography>
                        </Stack>
                      }
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={requireLogin}
                          onChange={(e) => setRequireLogin(e.target.checked)}
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Lock fontSize="small" />
                          <Typography variant="body2">Require Login</Typography>
                        </Stack>
                      }
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={allowRetake}
                          onChange={(e) => setAllowRetake(e.target.checked)}
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <People fontSize="small" />
                          <Typography variant="body2">Allow Retake</Typography>
                        </Stack>
                      }
                    />
                  </Grid>
                </Grid>
                
                <Collapse in={isTimed}>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Duration (minutes)"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                        fullWidth
                        InputProps={{
                          endAdornment: <InputAdornment position="end">min</InputAdornment>,
                        }}
                      />
                    </Grid>
                  </Grid>
                </Collapse>
                
                <Collapse in={allowRetake}>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Maximum Attempts"
                        type="number"
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                        fullWidth
                        helperText="0 for unlimited attempts"
                      />
                    </Grid>
                  </Grid>
                </Collapse>
              </Grid>
            </Grid>
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" color="primary">
                Questions ({questions.length})
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addQuestion}
                disabled={questions.length >= 100}
              >
                Add Question
              </Button>
            </Box>
            
            <List>
              {questions.map((question, qIndex) => (
                <Card 
                  key={question.id} 
                  sx={{ 
                    mb: 2,
                    borderLeft: expandedQuestion === qIndex ? "4px solid" : "1px solid",
                    borderColor: expandedQuestion === qIndex ? "primary.main" : "divider",
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => setExpandedQuestion(expandedQuestion === qIndex ? -1 : qIndex)}
                        >
                          {expandedQuestion === qIndex ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Question {qIndex + 1}
                        </Typography>
                        <Chip
                          label={QUESTION_TYPES.find(t => t.value === question.type)?.label || question.type}
                          size="small"
                          icon={QUESTION_TYPES.find(t => t.value === question.type)?.icon}
                          variant="outlined"
                        />
                        <Chip
                          label={`${question.points} point${question.points !== 1 ? "s" : ""}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                      
                      <Stack direction="row" spacing={1}>
                        {qIndex > 0 && (
                          <Tooltip title="Move up">
                            <IconButton size="small" onClick={() => moveQuestion(qIndex, qIndex - 1)}>
                              <ArrowBack fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {qIndex < questions.length - 1 && (
                          <Tooltip title="Move down">
                            <IconButton size="small" onClick={() => moveQuestion(qIndex, qIndex + 1)}>
                              <ArrowForward fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete question">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => removeQuestion(qIndex)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                    
                    <Collapse in={expandedQuestion === qIndex}>
                      <Box sx={{ mt: 2, pl: 6 }}>
                        <TextField
                          label="Question Text"
                          fullWidth
                          value={question.text}
                          onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                          required
                          multiline
                          rows={2}
                          sx={{ mb: 2 }}
                        />
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                              <InputLabel>Question Type</InputLabel>
                              <Select
                                value={question.type}
                                label="Question Type"
                                onChange={(e) => updateQuestion(qIndex, "type", e.target.value)}
                              >
                                {QUESTION_TYPES.map((type) => (
                                  <MenuItem key={type.value} value={type.value}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                      {type.icon}
                                      <Typography>{type.label}</Typography>
                                    </Stack>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          <Grid item xs={12} sm={3}>
                            <TextField
                              label="Points"
                              type="number"
                              value={question.points}
                              onChange={(e) => updateQuestion(qIndex, "points", Math.max(0, parseFloat(e.target.value) || 0))}
                              fullWidth
                              InputProps={{
                                inputProps: { min: 0, step: 0.5 },
                              }}
                            />
                          </Grid>
                          
                          <Grid item xs={12} sm={3}>
                            <FormControl fullWidth>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={question.required}
                                    onChange={(e) => updateQuestion(qIndex, "required", e.target.checked)}
                                  />
                                }
                                label="Required"
                                labelPlacement="start"
                                sx={{ ml: 0 }}
                              />
                            </FormControl>
                          </Grid>
                        </Grid>
                        
                        {/* Options for multiple choice, checkbox, dropdown */}
                        {["multiple_choice", "checkbox", "dropdown"].includes(question.type) && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Options
                            </Typography>
                            {question.options.map((option, oIndex) => (
                              <Box
                                key={option.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  mb: 1,
                                  p: 1,
                                  borderRadius: 1,
                                  bgcolor: "background.paper",
                                }}
                              >
                                {question.type === "multiple_choice" && (
                                  <IconButton
                                    size="small"
                                    color={option.isCorrect ? "success" : "default"}
                                    onClick={() => updateOption(qIndex, oIndex, "isCorrect", !option.isCorrect)}
                                  >
                                    <RadioButtonChecked />
                                  </IconButton>
                                )}
                                
                                {question.type === "checkbox" && (
                                  <IconButton
                                    size="small"
                                    color={option.isCorrect ? "success" : "default"}
                                    onClick={() => updateOption(qIndex, oIndex, "isCorrect", !option.isCorrect)}
                                  >
                                    <CheckBox />
                                  </IconButton>
                                )}
                                
                                <TextField
                                  value={option.text}
                                  onChange={(e) => updateOption(qIndex, oIndex, "text", e.target.value)}
                                  fullWidth
                                  size="small"
                                  placeholder={`Option ${oIndex + 1}`}
                                />
                                
                                <Tooltip title="Remove option">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                    disabled={question.options.length <= 2}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ))}
                            
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Add />}
                              onClick={() => addOption(qIndex)}
                              disabled={question.options.length >= 10}
                              sx={{ mt: 1 }}
                            >
                              Add Option
                            </Button>
                          </Box>
                        )}
                        
                        <TextField
                          label="Explanation (Optional)"
                          fullWidth
                          multiline
                          rows={2}
                          value={question.explanation}
                          onChange={(e) => updateQuestion(qIndex, "explanation", e.target.value)}
                          sx={{ mt: 2 }}
                          helperText="Explanation shown after answering"
                        />
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              ))}
            </List>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Review & Publish
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>{title}</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {description || "No description provided"}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AssessmentIcon fontSize="small" />
                      <Typography variant="body2">
                        {ASSESSMENT_TYPES.find(t => t.value === assessmentType)?.label}
                      </Typography>
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Timer fontSize="small" />
                      <Typography variant="body2">
                        {isTimed ? `${duration} minutes` : "Untimed"}
                      </Typography>
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <People fontSize="small" />
                      <Typography variant="body2">
                        {questions.length} questions
                      </Typography>
                    </Stack>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <BarChart fontSize="small" />
                      <Typography variant="body2">
                        Passing: {passingScore}%
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Review your assessment before publishing. You can save as a draft to continue editing later.
              </Typography>
            </Alert>
          </Box>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading assessment editor..." type="assessment" />;
  }

  return (
    <Box>
      {showHeader && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {assessmentToDuplicate ? "Duplicate Assessment" : "Create Assessment"}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create a new assessment for your organization
          </Typography>
        </Box>
      )}

      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {["Basic Information", "Add Questions", "Review & Publish"].map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
                  <Button
                    disabled={activeStep === 0}
                    onClick={handleBack}
                    startIcon={<ArrowBack />}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={activeStep === 2 ? () => setSaveDialogOpen(true) : handleNext}
                    endIcon={activeStep === 2 ? <Save /> : <ArrowForward />}
                  >
                    {activeStep === 2 ? "Save Assessment" : "Next"}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Assessment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Choose how you want to save this assessment:
          </Typography>
          
          <Stack spacing={2}>
            <FormControl>
              <FormControlLabel
                control={
                  <Radio
                    checked={saveOption === "publish"}
                    onChange={() => setSaveOption("publish")}
                    value="publish"
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight="medium">Publish Now</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Make assessment available immediately
                    </Typography>
                  </Box>
                }
              />
            </FormControl>
            
            <FormControl>
              <FormControlLabel
                control={
                  <Radio
                    checked={saveOption === "draft"}
                    onChange={() => setSaveOption("draft")}
                    value="draft"
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight="medium">Save as Draft</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Continue editing later
                    </Typography>
                  </Box>
                }
              />
            </FormControl>
            
            <FormControl>
              <FormControlLabel
                control={
                  <Radio
                    checked={saveOption === "schedule"}
                    onChange={() => setSaveOption("schedule")}
                    value="schedule"
                  />
                }
                label={
                  <Box>
                    <Typography fontWeight="medium">Schedule Publication</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Set a future date to publish
                    </Typography>
                  </Box>
                }
              />
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleSave(saveOption === "draft" ? "draft" : "active")}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? "Saving..." : "Confirm Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

CreateAssessment.propTypes = {
  organizationId: PropTypes.string,
  assessmentToDuplicate: PropTypes.object,
  onSuccess: PropTypes.func,
  showHeader: PropTypes.bool,
};

CreateAssessment.defaultProps = {
  organizationId: null,
  assessmentToDuplicate: null,
  onSuccess: null,
  showHeader: true,
};
