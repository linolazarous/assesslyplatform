// src/components/TakeAssessment.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Rating,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Avatar,
  Fade,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  Badge,
  Skeleton,
  InputAdornment,
} from "@mui/material";
import {
  Timer,
  Send,
  Save,
  ArrowBack,
  ArrowForward,
  SkipNext,
  SkipPrevious,
  QuestionAnswer,
  CheckCircle,
  Warning,
  Error,
  Info,
  HelpOutline,
  ExpandMore,
  ExpandLess,
  Visibility,
  Edit,
  ContentCopy,
  AttachFile,
  Image,
  PlayArrow,
  Pause,
  Stop,
  Flag,
  Bookmark,
  BookmarkBorder,
  NavigateNext,
  NavigateBefore,
  Close,
  Done,
  Refresh,
  Assessment as AssessmentIcon,
  People,
  BarChart,
  CalendarToday,
  Business,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { startAssessment, submitAssessment, saveProgress, getAssessmentProgress } from "../api/assessmentApi";
import LoadingScreen from "./ui/LoadingScreen";
import AnimatedCounter from "./ui/AnimatedCounter";

const QUESTION_TYPES = {
  text: { label: "Text Answer", icon: <QuestionAnswer /> },
  multiple_choice: { label: "Multiple Choice", icon: <CheckCircle /> },
  checkbox: { label: "Checkbox", icon: <Checkbox /> },
  rating: { label: "Rating Scale", icon: <Star /> },
  linear_scale: { label: "Linear Scale", icon: <LinearScale /> },
  dropdown: { label: "Dropdown", icon: <ExpandMore /> },
  file: { label: "File Upload", icon: <AttachFile /> },
  boolean: { label: "True/False", icon: <HelpOutline /> },
};

export default function TakeAssessment({
  previewMode = false,
  assessmentData = null,
  onComplete = null,
  showNavigation = true,
  allowSaveProgress = true,
  fullScreen = false,
}) {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const { user, currentOrganization } = useAuth();
  
  // State management
  const [assessment, setAssessment] = useState(assessmentData);
  const [loading, setLoading] = useState(!assessmentData);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [reviewMode, setReviewMode] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  
  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);

  // Fetch assessment data
  const fetchAssessment = useCallback(async () => {
    if (assessmentData) {
      setAssessment(assessmentData);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await startAssessment(assessmentId);
      setAssessment(data);
      
      // Initialize time if timed assessment
      if (data.duration && data.isTimed) {
        const durationSeconds = data.duration * 60;
        setTimeRemaining(durationSeconds);
        setStartedAt(new Date());
        
        // Show time warning at 10% remaining
        const warningTime = durationSeconds * 0.1;
        setTimeout(() => setShowTimeWarning(true), (durationSeconds - warningTime) * 1000);
      }
      
      // Load saved progress if any
      if (allowSaveProgress && !previewMode) {
        try {
          const savedProgress = await getAssessmentProgress(assessmentId);
          if (savedProgress) {
            setAnswers(savedProgress.answers || {});
            setBookmarkedQuestions(new Set(savedProgress.bookmarkedQuestions || []));
            setFlaggedQuestions(new Set(savedProgress.flaggedQuestions || []));
            setCurrentQuestion(savedProgress.currentQuestion || 0);
          }
        } catch (error) {
          console.log("No saved progress found");
        }
      }
      
    } catch (error) {
      console.error("Error loading assessment:", error);
      enqueueSnackbar(`Failed to load assessment: ${error.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [assessmentId, assessmentData, previewMode, allowSaveProgress, enqueueSnackbar, navigate]);

  // Auto-save progress
  const saveAssessmentProgress = useCallback(async () => {
    if (previewMode || !allowSaveProgress || !assessment || saving) return;
    
    setSaving(true);
    try {
      await saveProgress(assessmentId, {
        answers,
        bookmarkedQuestions: Array.from(bookmarkedQuestions),
        flaggedQuestions: Array.from(flaggedQuestions),
        currentQuestion,
        timeRemaining,
      });
      
      // Show subtle notification on first save only
      if (Object.keys(answers).length > 0) {
        enqueueSnackbar("Progress saved", {
          variant: "success",
          autoHideDuration: 2000,
          preventDuplicate: true,
        });
      }
    } catch (error) {
      console.error("Error saving progress:", error);
      // Don't show error to user for auto-save
    } finally {
      setSaving(false);
    }
  }, [assessmentId, answers, bookmarkedQuestions, flaggedQuestions, currentQuestion, timeRemaining, previewMode, allowSaveProgress, assessment, saving, enqueueSnackbar]);

  // Timer management
  useEffect(() => {
    if (timeRemaining === null || previewMode || submitting) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining, previewMode, submitting]);

  // Auto-save effect
  useEffect(() => {
    if (!previewMode && allowSaveProgress && assessment) {
      autoSaveRef.current = setInterval(saveAssessmentProgress, 30000); // Auto-save every 30 seconds
    }

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [previewMode, allowSaveProgress, assessment, saveAssessmentProgress]);

  // Initial fetch
  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  // Answer handlers
  const handleAnswerChange = useCallback((questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value,
    }));
    
    // Auto-save on answer change with debounce
    if (allowSaveProgress && !previewMode) {
      clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(saveAssessmentProgress, 1000);
    }
  }, [allowSaveProgress, previewMode, saveAssessmentProgress]);

  const toggleBookmark = useCallback((questionIndex) => {
    setBookmarkedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  }, []);

  const toggleFlag = useCallback((questionIndex) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  }, []);

  const navigateToQuestion = useCallback((index) => {
    setCurrentQuestion(index);
  }, []);

  // Validation
  const validateAnswers = useCallback(() => {
    if (!assessment?.questions) return { isValid: true, missing: [] };
    
    const missing = [];
    assessment.questions.forEach((question, index) => {
      if (question.required) {
        const answer = answers[index];
        if (
          answer === undefined ||
          answer === null ||
          answer === "" ||
          (Array.isArray(answer) && answer.length === 0)
        ) {
          missing.push(index + 1);
        }
      }
    });
    
    return {
      isValid: missing.length === 0,
      missing,
    };
  }, [assessment, answers]);

  // Submit handlers
  const handleAutoSubmit = useCallback(async () => {
    if (previewMode || submitting) return;
    
    setSubmitting(true);
    try {
      const result = await submitAssessment(assessmentId, {
        answers,
        durationMinutes: assessment?.duration ? Math.floor((assessment.duration * 60 - timeRemaining) / 60) : null,
        submittedAt: new Date().toISOString(),
      });
      
      enqueueSnackbar("Assessment submitted (time expired)", {
        variant: "info",
        autoHideDuration: 5000,
      });
      
      if (onComplete) {
        onComplete(result);
      } else {
        navigate(`/assessments/${assessmentId}/results`);
      }
    } catch (error) {
      console.error("Error auto-submitting:", error);
      enqueueSnackbar(`Failed to submit: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }, [assessmentId, answers, assessment, timeRemaining, previewMode, submitting, enqueueSnackbar, navigate, onComplete]);

  const handleManualSubmit = useCallback(async () => {
    if (previewMode || submitting) return;
    
    const validation = validateAnswers();
    if (!validation.isValid && timeRemaining > 60) {
      enqueueSnackbar(
        `Please answer all required questions: ${validation.missing.join(", ")}`,
        { variant: "warning" }
      );
      return;
    }
    
    setShowSubmitDialog(true);
  }, [previewMode, submitting, validateAnswers, timeRemaining, enqueueSnackbar]);

  const confirmSubmit = useCallback(async () => {
    setSubmitting(true);
    setShowSubmitDialog(false);
    
    try {
      const result = await submitAssessment(assessmentId, {
        answers,
        durationMinutes: assessment?.duration ? Math.floor((assessment.duration * 60 - timeRemaining) / 60) : null,
        submittedAt: new Date().toISOString(),
      });
      
      enqueueSnackbar("Assessment submitted successfully!", {
        variant: "success",
        autoHideDuration: 5000,
      });
      
      if (onComplete) {
        onComplete(result);
      } else {
        navigate(`/assessments/${assessmentId}/results`);
      }
    } catch (error) {
      console.error("Error submitting assessment:", error);
      enqueueSnackbar(`Failed to submit: ${error.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [assessmentId, answers, assessment, timeRemaining, enqueueSnackbar, navigate, onComplete]);

  // Time formatting
  const formatTime = useCallback((seconds) => {
    if (seconds === null || seconds === undefined) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const calculateProgress = useMemo(() => {
    if (!assessment?.questions) return 0;
    const answered = assessment.questions.reduce((count, _, index) => {
      const answer = answers[index];
      return count + (answer !== undefined && answer !== "" && !(Array.isArray(answer) && answer.length === 0) ? 1 : 0);
    }, 0);
    return Math.round((answered / assessment.questions.length) * 100);
  }, [assessment, answers]);

  if (loading) {
    return <LoadingScreen message="Loading assessment..." type="assessment" />;
  }

  if (!assessment) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Assessment Not Found</Typography>
        <Typography variant="body2">
          The assessment you're trying to access doesn't exist or you don't have permission to view it.
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </Button>
      </Alert>
    );
  }

  const currentQ = assessment.questions?.[currentQuestion];
  const totalQuestions = assessment.questions?.length || 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: fullScreen ? 0 : 2 }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          borderLeft: 6,
          borderColor: "primary.main",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {assessment.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {assessment.description}
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={6} sm={3}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <People fontSize="small" />
                  <Typography variant="body2">
                    Candidate: {user?.name || "Anonymous"}
                  </Typography>
                </Stack>
              </Grid>
              
              {assessment.duration && (
                <Grid item xs={6} sm={3}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Timer fontSize="small" />
                    <Typography variant="body2" color={timeRemaining < 300 ? "error" : "inherit"}>
                      {timeRemaining !== null ? (
                        <>
                          {formatTime(timeRemaining)} remaining
                          {showTimeWarning && (
                            <Chip
                              label="Time Warning"
                              color="warning"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </>
                      ) : (
                        `${assessment.duration} minutes`
                      )}
                    </Typography>
                  </Stack>
                </Grid>
              )}
              
              <Grid item xs={6} sm={3}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <QuestionAnswer fontSize="small" />
                  <Typography variant="body2">
                    {totalQuestions} questions
                  </Typography>
                </Stack>
              </Grid>
              
              {currentOrganization && (
                <Grid item xs={6} sm={3}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Business fontSize="small" />
                    <Typography variant="body2">
                      {currentOrganization.name}
                    </Typography>
                  </Stack>
                </Grid>
              )}
            </Grid>
          </Box>
          
          {previewMode && (
            <Chip
              label="Preview Mode"
              color="warning"
              variant="outlined"
              icon={<Visibility />}
            />
          )}
        </Box>

        {/* Progress bars */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="caption">
              Progress: {calculateProgress}%
            </Typography>
            <Typography variant="caption">
              Question {currentQuestion + 1} of {totalQuestions}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={calculateProgress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          
          {timeRemaining !== null && (
            <>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 2, mb: 1 }}>
                <Typography variant="caption">
                  Time elapsed
                </Typography>
                <Typography variant="caption">
                  {formatTime((assessment.duration * 60) - timeRemaining)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={((assessment.duration * 60 - timeRemaining) / (assessment.duration * 60)) * 100}
                color="secondary"
                sx={{ height: 4, borderRadius: 4 }}
              />
            </>
          )}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Questions Navigation */}
        {showNavigation && totalQuestions > 1 && (
          <Grid item xs={12} md={3}>
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2, position: "sticky", top: 20 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Questions
              </Typography>
              <Grid container spacing={1}>
                {assessment.questions?.map((_, index) => {
                  const isAnswered = answers[index] !== undefined && 
                    answers[index] !== "" && 
                    !(Array.isArray(answers[index]) && answers[index].length === 0);
                  const isBookmarked = bookmarkedQuestions.has(index);
                  const isFlagged = flaggedQuestions.has(index);
                  
                  return (
                    <Grid item xs={4} key={index}>
                      <Button
                        variant={currentQuestion === index ? "contained" : "outlined"}
                        color={
                          isFlagged ? "error" :
                          isBookmarked ? "warning" :
                          isAnswered ? "success" : "default"
                        }
                        onClick={() => navigateToQuestion(index)}
                        sx={{
                          minWidth: 40,
                          height: 40,
                          borderRadius: 2,
                        }}
                      >
                        {index + 1}
                        {isBookmarked && <Bookmark fontSize="small" sx={{ position: "absolute", top: 2, right: 2 }} />}
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<BookmarkBorder />}
                  onClick={() => toggleBookmark(currentQuestion)}
                >
                  {bookmarkedQuestions.has(currentQuestion) ? "Unbookmark" : "Bookmark"}
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Flag />}
                  onClick={() => toggleFlag(currentQuestion)}
                  color={flaggedQuestions.has(currentQuestion) ? "error" : "default"}
                >
                  {flaggedQuestions.has(currentQuestion) ? "Unflag" : "Flag for review"}
                </Button>
                
                {allowSaveProgress && !previewMode && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Save />}
                    onClick={saveAssessmentProgress}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Progress"}
                  </Button>
                )}
              </Stack>
            </Paper>
          </Grid>
        )}

        {/* Main Question Area */}
        <Grid item xs={12} md={showNavigation && totalQuestions > 1 ? 9 : 12}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, minHeight: 400 }}>
            {currentQ ? (
              <>
                {/* Question Header */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Question {currentQuestion + 1}
                      {currentQ.required && (
                        <Chip
                          label="Required"
                          size="small"
                          color="error"
                          sx={{ ml: 2, height: 20 }}
                        />
                      )}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Chip
                        label={QUESTION_TYPES[currentQ.type]?.label || currentQ.type}
                        size="small"
                        icon={QUESTION_TYPES[currentQ.type]?.icon}
                        variant="outlined"
                      />
                      <Chip
                        label={`${currentQ.points || 1} point${currentQ.points !== 1 ? "s" : ""}`}
                        size="small"
                        color="primary"
                      />
                    </Stack>
                  </Box>
                  
                  <Stack direction="row" spacing={1}>
                    {bookmarkedQuestions.has(currentQuestion) && (
                      <Tooltip title="Bookmarked">
                        <Bookmark color="warning" />
                      </Tooltip>
                    )}
                    {flaggedQuestions.has(currentQuestion) && (
                      <Tooltip title="Flagged for review">
                        <Flag color="error" />
                      </Tooltip>
                    )}
                  </Stack>
                </Box>

                {/* Question Text */}
                <Typography variant="body1" paragraph sx={{ fontSize: "1.1rem", lineHeight: 1.6 }}>
                  {currentQ.text}
                </Typography>
                
                {currentQ.explanation && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">{currentQ.explanation}</Typography>
                  </Alert>
                )}

                {/* Answer Input */}
                <Box sx={{ mt: 4 }}>
                  {currentQ.type === "text" && (
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      value={answers[currentQuestion] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                      placeholder="Type your answer here..."
                      variant="outlined"
                    />
                  )}
                  
                  {currentQ.type === "multiple_choice" && (
                    <RadioGroup
                      value={answers[currentQuestion] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                    >
                      {currentQ.options?.map((option, oIndex) => (
                        <Card
                          key={oIndex}
                          sx={{
                            mb: 1,
                            border: answers[currentQuestion] === option.text ? 2 : 1,
                            borderColor: answers[currentQuestion] === option.text ? "primary.main" : "divider",
                          }}
                        >
                          <FormControlLabel
                            value={option.text}
                            control={<Radio />}
                            label={
                              <Box sx={{ py: 1 }}>
                                <Typography>{option.text}</Typography>
                                {option.isCorrect && previewMode && (
                                  <Chip
                                    label="Correct Answer"
                                    size="small"
                                    color="success"
                                    sx={{ mt: 0.5 }}
                                  />
                                )}
                              </Box>
                            }
                            sx={{ m: 0, width: "100%", p: 1 }}
                          />
                        </Card>
                      ))}
                    </RadioGroup>
                  )}
                  
                  {currentQ.type === "checkbox" && (
                    <FormGroup>
                      {currentQ.options?.map((option, oIndex) => (
                        <FormControlLabel
                          key={oIndex}
                          control={
                            <Checkbox
                              checked={answers[currentQuestion]?.includes(option.text) || false}
                              onChange={(e) => {
                                const current = answers[currentQuestion] || [];
                                const newValue = e.target.checked
                                  ? [...current, option.text]
                                  : current.filter(v => v !== option.text);
                                handleAnswerChange(currentQuestion, newValue);
                              }}
                            />
                          }
                          label={option.text}
                        />
                      ))}
                    </FormGroup>
                  )}
                  
                  {currentQ.type === "rating" && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Rating
                        value={Number(answers[currentQuestion]) || 0}
                        onChange={(event, newValue) => handleAnswerChange(currentQuestion, newValue)}
                        precision={1}
                        max={5}
                        size="large"
                      />
                      <Typography variant="h6" color="primary">
                        {answers[currentQuestion] || 0} / 5
                      </Typography>
                    </Box>
                  )}
                  
                  {currentQ.type === "boolean" && (
                    <RadioGroup
                      value={answers[currentQuestion] === true ? "true" : answers[currentQuestion] === false ? "false" : ""}
                      onChange={(e) => handleAnswerChange(currentQuestion, e.target.value === "true")}
                      row
                      sx={{ gap: 2 }}
                    >
                      <Button
                        variant={answers[currentQuestion] === true ? "contained" : "outlined"}
                        onClick={() => handleAnswerChange(currentQuestion, true)}
                        sx={{ minWidth: 100 }}
                      >
                        True
                      </Button>
                      <Button
                        variant={answers[currentQuestion] === false ? "contained" : "outlined"}
                        onClick={() => handleAnswerChange(currentQuestion, false)}
                        sx={{ minWidth: 100 }}
                      >
                        False
                      </Button>
                    </RadioGroup>
                  )}
                </Box>

                {/* Navigation Buttons */}
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                  <Button
                    variant="outlined"
                    startIcon={<NavigateBefore />}
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                  >
                    Previous
                  </Button>
                  
                  <Stack direction="row" spacing={1}>
                    {allowSaveProgress && !previewMode && (
                      <Button
                        variant="outlined"
                        startIcon={<Save />}
                        onClick={saveAssessmentProgress}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    )}
                    
                    <Button
                      variant="contained"
                      endIcon={<NavigateNext />}
                      onClick={() => {
                        if (currentQuestion < totalQuestions - 1) {
                          setCurrentQuestion(prev => prev + 1);
                        } else {
                          handleManualSubmit();
                        }
                      }}
                    >
                      {currentQuestion < totalQuestions - 1 ? "Next" : "Review & Submit"}
                    </Button>
                  </Stack>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  No questions available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle>Submit Assessment</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to submit your assessment?
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Once submitted, you cannot make changes to your answers.
            </Typography>
          </Alert>
          
          {assessment.duration && timeRemaining > 0 && (
            <Alert severity="warning">
              <Typography variant="body2">
                You still have {formatTime(timeRemaining)} remaining. You can continue if you need more time.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={confirmSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
          >
            {submitting ? "Submitting..." : "Submit Assessment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

TakeAssessment.propTypes = {
  previewMode: PropTypes.bool,
  assessmentData: PropTypes.object,
  onComplete: PropTypes.func,
  showNavigation: PropTypes.bool,
  allowSaveProgress: PropTypes.bool,
  fullScreen: PropTypes.bool,
};

TakeAssessment.defaultProps = {
  previewMode: false,
  assessmentData: null,
  onComplete: null,
  showNavigation: true,
  allowSaveProgress: true,
  fullScreen: false,
};
