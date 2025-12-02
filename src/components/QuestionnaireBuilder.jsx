// src/components/QuestionnaireBuilder.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Grid,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  Chip,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tabs,
  Tab,
  Badge,
  InputAdornment,
  Collapse,
  Radio,
  RadioGroup,
} from "@mui/material";
import {
  Add,
  Delete,
  Save,
  ContentCopy,
  Visibility,
  Edit,
  ArrowBack,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  HelpOutline,
  CheckCircle,
  RadioButtonChecked,
  CheckBox,
  ShortText,
  LinearScale,
  Star,
  UploadFile,
  FormatListBulleted,
  QuestionAnswer,
  Assessment as AssessmentIcon,
  Template,
  Business,
  Timer,
  People,
  BarChart,
  Settings,
  Refresh,
  FolderOpen,
  InsertDriveFile,
  Bookmark,
  BookmarkBorder,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { createAssessment, createTemplate, fetchTemplates, duplicateTemplate } from "../api/assessmentApi";
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

const TEMPLATE_CATEGORIES = [
  { value: "employee_evaluation", label: "Employee Evaluation" },
  { value: "customer_feedback", label: "Customer Feedback" },
  { value: "skills_assessment", label: "Skills Assessment" },
  { value: "training_quiz", label: "Training Quiz" },
  { value: "recruitment", label: "Recruitment" },
  { value: "compliance", label: "Compliance" },
  { value: "academic", label: "Academic" },
  { value: "research", label: "Research" },
];

export default function QuestionnaireBuilder({
  organizationId = null,
  templateId = null,
  mode = "create", // 'create', 'edit', 'duplicate'
  onSuccess = null,
  showHeader = true,
  showTemplates = true,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { currentOrganization, isSuperAdmin } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState("builder");
  const [expandedQuestion, setExpandedQuestion] = useState(0);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [templateCategory, setTemplateCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(showTemplates);
  
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
  
  // Templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Dialogs
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveOption, setSaveOption] = useState("draft");

  // Initialize if editing or duplicating
  useEffect(() => {
    if (templateId) {
      loadTemplateData(templateId);
    } else if (mode === "edit" && organizationId) {
      // Load existing assessment/template data
      // This would come from API
    }
    
    if (showTemplates) {
      loadTemplates();
    }
  }, [templateId, mode, organizationId, showTemplates]);

  const loadTemplateData = async (id) => {
    setLoading(true);
    try {
      // API call to fetch template
      // const template = await fetchTemplate(id);
      // setTitle(`${template.title} (Copy)`);
      // setQuestions(template.questions);
      // etc.
    } catch (error) {
      enqueueSnackbar(`Failed to load template: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await fetchTemplates({
        organizationId: organizationId || currentOrganization?.id,
      });
      setTemplates(data.data || data.items || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Question management
  const addQuestion = useCallback(() => {
    if (questions.length >= 100) {
      enqueueSnackbar("Maximum 100 questions allowed", { variant: "warning" });
      return;
    }
    
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
  }, [questions, enqueueSnackbar]);

  const removeQuestion = useCallback((index) => {
    if (questions.length <= 1) {
      enqueueSnackbar("Questionnaire must have at least one question", { variant: "warning" });
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
    if (newQuestions[qIndex].options.length >= 10) {
      enqueueSnackbar("Maximum 10 options per question", { variant: "warning" });
      return;
    }
    newQuestions[qIndex].options.push({
      id: Date.now(),
      text: "",
      isCorrect: false,
    });
    setQuestions(newQuestions);
  }, [questions, enqueueSnackbar]);

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
    if (newQuestions[qIndex].options.length <= 2) {
      enqueueSnackbar("At least two options required", { variant: "warning" });
      return;
    }
    newQuestions[qIndex].options.splice(oIndex, 1);
    setQuestions(newQuestions);
  }, [questions, enqueueSnackbar]);

  const applyTemplate = useCallback((template) => {
    setSelectedTemplate(template);
    setTitle(template.title);
    setDescription(template.description || "");
    setInstructions(template.instructions || "");
    setEstimatedTime(template.estimatedTime || 30);
    
    if (template.questions && template.questions.length > 0) {
      const templateQuestions = template.questions.map((q, index) => ({
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
      setQuestions(templateQuestions);
    }
    
    setActiveTab("builder");
    enqueueSnackbar(`Template "${template.title}" applied`, {
      variant: "success",
      autoHideDuration: 3000,
    });
  }, [enqueueSnackbar]);

  // Validation
  const validateStep = useCallback((step) => {
    switch (step) {
      case 0:
        if (!title.trim()) {
          enqueueSnackbar("Title is required", { variant: "error" });
          return false;
        }
        if (title.length < 3) {
          enqueueSnackbar("Title must be at least 3 characters", { variant: "error" });
          return false;
        }
        return true;
        
      case 1:
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

  // Save handlers
  const handleSave = async (status = "draft") => {
    if (!validateStep(0) || !validateStep(1)) return;
    
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        estimatedTime,
        status: isTemplate ? "template" : status,
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

      if (isTemplate) {
        payload.templateCategory = templateCategory;
        payload.tags = tags;
        const result = await createTemplate(payload);
        enqueueSnackbar("Template saved successfully!", { variant: "success" });
        if (onSuccess) {
          onSuccess(result);
        } else {
          navigate("/templates");
        }
      } else {
        const result = await createAssessment(payload);
        enqueueSnackbar("Questionnaire created successfully!", { variant: "success" });
        if (onSuccess) {
          onSuccess(result);
        } else {
          navigate(`/assessments/${result.id}`);
        }
      }
      
      setSaveDialogOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
      enqueueSnackbar(`Failed to save: ${error.message}`, {
        variant: "error",
        autoHideDuration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const renderTemplatesPanel = () => (
    <Paper elevation={1} sx={{ p: 2, height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">Template Library</Typography>
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={loadTemplates}
          disabled={templatesLoading}
        >
          Refresh
        </Button>
      </Box>
      
      {templatesLoading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Alert severity="info" sx={{ my: 2 }}>
          No templates available. Create your first template!
        </Alert>
      ) : (
        <List>
          {templates.map((template) => (
            <Card
              key={template.id}
              sx={{
                mb: 1,
                cursor: "pointer",
                border: selectedTemplate?.id === template.id ? 2 : 1,
                borderColor: selectedTemplate?.id === template.id ? "primary.main" : "divider",
              }}
              onClick={() => applyTemplate(template)}
            >
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Avatar sx={{ bgcolor: "primary.light" }}>
                    <Template />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {template.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {template.description || "No description"}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Chip
                        label={`${template.questions?.length || 0} questions`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={template.category || "Uncategorized"}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </List>
      )}
      
      <Button
        variant="outlined"
        fullWidth
        startIcon={<Add />}
        onClick={() => setIsTemplate(true)}
        sx={{ mt: 2 }}
      >
        Create New Template
      </Button>
    </Paper>
  );

  const renderBuilderContent = () => (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Stepper activeStep={activeStep} orientation="vertical">
        <Step key="basic-info">
          <StepLabel>Basic Information</StepLabel>
          <StepContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  fullWidth
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  helperText="Choose a descriptive title for your questionnaire"
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
                  helperText="Provide context and instructions for respondents"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Instructions"
                  fullWidth
                  multiline
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  helperText="Specific instructions for taking this questionnaire"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Estimated Time (minutes)"
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(Math.max(1, parseInt(e.target.value) || 30))}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">min</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Save as</InputLabel>
                  <Select
                    value={isTemplate ? "template" : "assessment"}
                    label="Save as"
                    onChange={(e) => setIsTemplate(e.target.value === "template")}
                  >
                    <MenuItem value="assessment">Assessment</MenuItem>
                    <MenuItem value="template">Template</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {isTemplate && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={templateCategory}
                        label="Category"
                        onChange={(e) => setTemplateCategory(e.target.value)}
                      >
                        <MenuItem value="">Select category</MenuItem>
                        {TEMPLATE_CATEGORIES.map((cat) => (
                          <MenuItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Tags (comma separated)"
                      fullWidth
                      value={tags.join(", ")}
                      onChange={(e) => setTags(e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag))}
                      helperText="Add tags to help organize templates"
                    />
                  </Grid>
                </>
              )}
            </Grid>
            
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={handleNext} variant="contained">
                Next: Add Questions
              </Button>
            </Box>
          </StepContent>
        </Step>
        
        <Step key="questions">
          <StepLabel>Questions ({questions.length})</StepLabel>
          <StepContent>
            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle1">
                Build your questionnaire questions
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
                        {question.required && (
                          <Chip label="Required" size="small" color="error" variant="outlined" />
                        )}
                      </Box>
                      
                      <Tooltip title="Delete question">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
                              onChange={(e) => updateQuestion(qIndex, "points", Math.max(0, parseFloat(e.target.value) || 1))}
                              fullWidth
                            />
                          </Grid>
                          
                          <Grid item xs={12} sm={3}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={question.required}
                                  onChange={(e) => updateQuestion(qIndex, "required", e.target.checked)}
                                />
                              }
                              label="Required"
                              sx={{ mt: 1 }}
                            />
                          </Grid>
                        </Grid>
                        
                        {/* Options for question types that support them */}
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
                                  <Radio
                                    checked={option.isCorrect}
                                    onChange={(e) => updateOption(qIndex, oIndex, "isCorrect", e.target.checked)}
                                  />
                                )}
                                
                                {question.type === "checkbox" && (
                                  <Checkbox
                                    checked={option.isCorrect}
                                    onChange={(e) => updateOption(qIndex, oIndex, "isCorrect", e.target.checked)}
                                  />
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
            
            <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
              <Button onClick={handleBack} startIcon={<ArrowBack />}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={() => setSaveDialogOpen(true)}
                startIcon={<Save />}
              >
                Save {isTemplate ? "Template" : "Questionnaire"}
              </Button>
            </Box>
          </StepContent>
        </Step>
      </Stepper>
    </Paper>
  );

  if (loading) {
    return <LoadingScreen message="Loading questionnaire builder..." type="assessment" />;
  }

  return (
    <Box>
      {showHeader && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {mode === "edit" ? "Edit Questionnaire" : 
             mode === "duplicate" ? "Duplicate Questionnaire" : 
             "Questionnaire Builder"}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create assessments, surveys, and questionnaires for your organization
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Templates Panel */}
        {showTemplatesPanel && (
          <Grid item xs={12} md={4}>
            {renderTemplatesPanel()}
          </Grid>
        )}

        {/* Builder Area */}
        <Grid item xs={12} md={showTemplatesPanel ? 8 : 12}>
          {renderBuilderContent()}
        </Grid>
      </Grid>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>
          Save {isTemplate ? "Template" : "Questionnaire"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Choose how you want to save this {isTemplate ? "template" : "questionnaire"}:
          </Typography>
          
          <RadioGroup
            value={saveOption}
            onChange={(e) => setSaveOption(e.target.value)}
          >
            {!isTemplate && (
              <FormControlLabel
                value="draft"
                control={<Radio />}
                label={
                  <Box>
                    <Typography fontWeight="medium">Save as Draft</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Save privately for further editing
                    </Typography>
                  </Box>
                }
              />
            )}
            
            <FormControlLabel
              value={isTemplate ? "template" : "publish"}
              control={<Radio />}
              label={
                <Box>
                  <Typography fontWeight="medium">
                    {isTemplate ? "Save as Template" : "Publish Now"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isTemplate 
                      ? "Save to template library for reuse" 
                      : "Make available for respondents"}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => handleSave(saveOption)}
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

QuestionnaireBuilder.propTypes = {
  organizationId: PropTypes.string,
  templateId: PropTypes.string,
  mode: PropTypes.oneOf(["create", "edit", "duplicate"]),
  onSuccess: PropTypes.func,
  showHeader: PropTypes.bool,
  showTemplates: PropTypes.bool,
};

QuestionnaireBuilder.defaultProps = {
  organizationId: null,
  templateId: null,
  mode: "create",
  onSuccess: null,
  showHeader: true,
  showTemplates: true,
};
