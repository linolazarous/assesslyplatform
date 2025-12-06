// src/api/assessmentApi.js
import api, { API_ENDPOINTS, TokenManager, trackError } from './index';

/**
 * Assessment API Service - Complete version
 * Handles all assessment operations for the Assessly Platform
 * Multi-tenant aware with organization context
 */

// ==================== ASSESSMENT SESSION MANAGEMENT ====================

/**
 * Start a new assessment session
 * @param {string} assessmentId - The ID of the assessment to start
 * @param {Object} options - Additional options
 * @param {string} options.candidateId - Candidate ID (optional)
 * @param {string} options.organizationId - Organization ID
 * @returns {Promise} Assessment session data
 */
export const startAssessment = async (assessmentId, options = {}) => {
  try {
    // Add organization context if not provided
    if (!options.organizationId) {
      const tenantId = TokenManager.getTenantId();
      if (tenantId) {
        options.organizationId = tenantId;
      }
    }

    const response = await api.post(`/assessments/${assessmentId}/start`, options);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error starting assessment:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/start`, 
      method: 'POST',
      assessmentId 
    });
    throw error;
  }
};

/**
 * Submit a completed assessment
 * @param {string} assessmentId - Assessment ID
 * @param {Object} submissionData - Answers and metadata
 * @returns {Promise} Submission result
 */
export const submitAssessment = async (assessmentId, submissionData) => {
  try {
    const response = await api.post(`/assessments/${assessmentId}/submit`, submissionData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error submitting assessment:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/submit`, 
      method: 'POST',
      assessmentId 
    });
    throw error;
  }
};

/**
 * Save assessment progress
 * @param {string} assessmentId - Assessment ID
 * @param {Object} progressData - Progress data
 * @returns {Promise} Save result
 */
export const saveProgress = async (assessmentId, progressData) => {
  try {
    const response = await api.post(`/assessments/${assessmentId}/progress`, progressData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error saving progress:', error);
    // Don't throw for progress save errors - they shouldn't break the assessment
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/progress`, 
      method: 'POST',
      assessmentId,
      isProgressSave: true 
    });
    return { success: false, message: 'Failed to save progress' };
  }
};

/**
 * Get assessment progress
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Progress data
 */
export const getAssessmentProgress = async (assessmentId) => {
  try {
    const response = await api.get(`/assessments/${assessmentId}/progress`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error getting progress:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/progress`, 
      method: 'GET',
      assessmentId 
    });
    throw error;
  }
};

// ==================== ASSESSMENT CRUD OPERATIONS ====================

/**
 * Fetch assessments with filtering
 * @param {Object} params - Query parameters
 * @returns {Promise} Assessments list
 */
export const fetchAssessments = async (params = {}) => {
  try {
    // Add organization context for filtering
    const organizationId = TokenManager.getTenantId();
    if (organizationId && !params.organizationId) {
      params.organizationId = organizationId;
    }

    const response = await api.get('/assessments', { params });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching assessments:', error);
    trackError(error, { endpoint: '/assessments', params });
    throw error;
  }
};

/**
 * Fetch single assessment by ID
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Assessment data
 */
export const fetchAssessmentById = async (assessmentId) => {
  try {
    const response = await api.get(`/assessments/${assessmentId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching assessment:', error);
    trackError(error, { endpoint: `/assessments/${assessmentId}` });
    throw error;
  }
};

/**
 * Create a new assessment
 * @param {Object} assessmentData - Assessment data
 * @returns {Promise} Created assessment
 */
export const createAssessment = async (assessmentData) => {
  try {
    // Add organization context if not provided
    if (!assessmentData.organizationId) {
      const tenantId = TokenManager.getTenantId();
      if (tenantId) {
        assessmentData.organizationId = tenantId;
      }
    }

    const response = await api.post('/assessments', assessmentData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error creating assessment:', error);
    trackError(error, { 
      endpoint: '/assessments', 
      method: 'POST',
      data: assessmentData 
    });
    throw error;
  }
};

/**
 * Update assessment
 * @param {string} assessmentId - Assessment ID
 * @param {Object} updates - Assessment updates
 * @returns {Promise} Updated assessment
 */
export const updateAssessment = async (assessmentId, updates) => {
  try {
    const response = await api.put(`/assessments/${assessmentId}`, updates);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error updating assessment:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}`, 
      method: 'PUT',
      data: updates 
    });
    throw error;
  }
};

/**
 * Delete assessment
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Delete result
 */
export const deleteAssessment = async (assessmentId) => {
  try {
    const response = await api.delete(`/assessments/${assessmentId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error deleting assessment:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}`, 
      method: 'DELETE' 
    });
    throw error;
  }
};

/**
 * Publish assessment
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Publish result
 */
export const publishAssessment = async (assessmentId) => {
  try {
    const response = await api.post(`/assessments/${assessmentId}/publish`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error publishing assessment:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/publish`, 
      method: 'POST' 
    });
    throw error;
  }
};

/**
 * Unpublish assessment
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Unpublish result
 */
export const unpublishAssessment = async (assessmentId) => {
  try {
    const response = await api.post(`/assessments/${assessmentId}/unpublish`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error unpublishing assessment:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/unpublish`, 
      method: 'POST' 
    });
    throw error;
  }
};

/**
 * Update assessment status (publish/unpublish/archive)
 * @param {string} assessmentId - Assessment ID
 * @param {string} status - New status (published, unpublished, archived, draft)
 * @returns {Promise} Updated assessment
 */
export const updateAssessmentStatus = async (assessmentId, status) => {
  try {
    const response = await api.put(`/assessments/${assessmentId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error updating assessment status:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/status`, 
      method: 'PUT',
      data: { status } 
    });
    throw error;
  }
};

/**
 * Duplicate an existing assessment
 * @param {string} assessmentId - Original assessment ID
 * @param {Object} options - Duplication options
 * @returns {Promise} Duplicated assessment
 */
export const duplicateAssessment = async (assessmentId, options = {}) => {
  try {
    const response = await api.post(`/assessments/${assessmentId}/duplicate`, options);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error duplicating assessment:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/duplicate`, 
      method: 'POST',
      data: options 
    });
    throw error;
  }
};

// ==================== ASSESSMENT QUESTIONS ====================

/**
 * Fetch assessment questions
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Questions list
 */
export const fetchAssessmentQuestions = async (assessmentId) => {
  try {
    const response = await api.get(`/assessments/${assessmentId}/questions`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching questions:', error);
    trackError(error, { endpoint: `/assessments/${assessmentId}/questions` });
    throw error;
  }
};

/**
 * Add question to assessment
 * @param {string} assessmentId - Assessment ID
 * @param {Object} questionData - Question data
 * @returns {Promise} Added question
 */
export const addQuestion = async (assessmentId, questionData) => {
  try {
    const response = await api.post(`/assessments/${assessmentId}/questions`, questionData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error adding question:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/questions`, 
      method: 'POST',
      data: questionData 
    });
    throw error;
  }
};

/**
 * Update question
 * @param {string} assessmentId - Assessment ID
 * @param {string} questionId - Question ID
 * @param {Object} updates - Question updates
 * @returns {Promise} Updated question
 */
export const updateQuestion = async (assessmentId, questionId, updates) => {
  try {
    const response = await api.put(`/assessments/${assessmentId}/questions/${questionId}`, updates);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error updating question:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/questions/${questionId}`, 
      method: 'PUT',
      data: updates 
    });
    throw error;
  }
};

/**
 * Delete question
 * @param {string} assessmentId - Assessment ID
 * @param {string} questionId - Question ID
 * @returns {Promise} Delete result
 */
export const deleteQuestion = async (assessmentId, questionId) => {
  try {
    const response = await api.delete(`/assessments/${assessmentId}/questions/${questionId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error deleting question:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/questions/${questionId}`, 
      method: 'DELETE' 
    });
    throw error;
  }
};

/**
 * Reorder questions
 * @param {string} assessmentId - Assessment ID
 * @param {Array} questionOrder - New question order
 * @returns {Promise} Reorder result
 */
export const reorderQuestions = async (assessmentId, questionOrder) => {
  try {
    const response = await api.put(`/assessments/${assessmentId}/questions/reorder`, { order: questionOrder });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error reordering questions:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/questions/reorder`, 
      method: 'PUT',
      data: { order: questionOrder } 
    });
    throw error;
  }
};

// ==================== ASSESSMENT SESSIONS ====================

/**
 * Fetch assessment session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise} Session data
 */
export const fetchSessionById = async (sessionId) => {
  try {
    const response = await api.get(`/assessment-sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching session:', error);
    trackError(error, { endpoint: `/assessment-sessions/${sessionId}` });
    throw error;
  }
};

/**
 * Fetch user's assessment sessions
 * @param {Object} params - Query parameters
 * @returns {Promise} Sessions list
 */
export const fetchUserSessions = async (params = {}) => {
  try {
    const response = await api.get('/assessment-sessions', { params });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching user sessions:', error);
    trackError(error, { endpoint: '/assessment-sessions', params });
    throw error;
  }
};

/**
 * Resume assessment session
 * @param {string} sessionId - Session ID
 * @returns {Promise} Session data
 */
export const resumeSession = async (sessionId) => {
  try {
    const response = await api.post(`/assessment-sessions/${sessionId}/resume`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error resuming session:', error);
    trackError(error, { 
      endpoint: `/assessment-sessions/${sessionId}/resume`, 
      method: 'POST' 
    });
    throw error;
  }
};

/**
 * Validate assessment session
 * @param {string} sessionId - Session ID
 * @returns {Promise} Validation result
 */
export const validateSession = async (sessionId) => {
  try {
    const response = await api.get(`/assessment-sessions/${sessionId}/validate`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error validating session:', error);
    trackError(error, { endpoint: `/assessment-sessions/${sessionId}/validate` });
    throw error;
  }
};

// ==================== ASSESSMENT RESULTS ====================

/**
 * Fetch assessment results
 * @param {string} assessmentId - Assessment ID
 * @param {Object} params - Query parameters
 * @returns {Promise} Results data
 */
export const fetchAssessmentResults = async (assessmentId, params = {}) => {
  try {
    const response = await api.get(`/assessments/${assessmentId}/results`, { params });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching results:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/results`, 
      params 
    });
    throw error;
  }
};

/**
 * Fetch user's assessment result
 * @param {string} sessionId - Session ID
 * @returns {Promise} Result data
 */
export const fetchUserResult = async (sessionId) => {
  try {
    const response = await api.get(`/assessment-sessions/${sessionId}/result`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching user result:', error);
    trackError(error, { endpoint: `/assessment-sessions/${sessionId}/result` });
    throw error;
  }
};

/**
 * Generate assessment report
 * @param {string} sessionId - Session ID
 * @param {Object} reportOptions - Report options
 * @returns {Promise} Report data
 */
export const generateReport = async (sessionId, reportOptions = {}) => {
  try {
    const response = await api.post(`/assessment-sessions/${sessionId}/report`, reportOptions);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error generating report:', error);
    trackError(error, { 
      endpoint: `/assessment-sessions/${sessionId}/report`, 
      method: 'POST',
      data: reportOptions 
    });
    throw error;
  }
};

// ==================== ASSESSMENT ANALYTICS ====================

/**
 * Fetch assessment analytics
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Analytics data
 */
export const fetchAssessmentAnalytics = async (assessmentId) => {
  try {
    const response = await api.get(`/assessments/${assessmentId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching analytics:', error);
    trackError(error, { endpoint: `/assessments/${assessmentId}/analytics` });
    throw error;
  }
};

/**
 * Fetch question analytics
 * @param {string} assessmentId - Assessment ID
 * @param {string} questionId - Question ID
 * @returns {Promise} Question analytics
 */
export const fetchQuestionAnalytics = async (assessmentId, questionId) => {
  try {
    const response = await api.get(`/assessments/${assessmentId}/questions/${questionId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching question analytics:', error);
    trackError(error, { 
      endpoint: `/assessments/${assessmentId}/questions/${questionId}/analytics` 
    });
    throw error;
  }
};

// ==================== MOCK DATA FOR DEVELOPMENT ====================

/**
 * Get mock assessment data for development
 * @param {string} endpoint - Mock endpoint name
 * @returns {Promise} Mock data
 */
export const getMockAssessmentData = async (endpoint) => {
  // Only return mock data in development
  if (!import.meta.env.DEV) {
    console.warn('[AssessmentAPI] Mock data only available in development');
    return null;
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const mockData = {
    'startAssessment': {
      success: true,
      data: {
        id: 'session_12345',
        assessmentId: 'assessment_123',
        userId: 'user_456',
        status: 'in_progress',
        startedAt: '2024-01-15T10:30:00Z',
        timeRemaining: 2700, // 45 minutes in seconds
        currentQuestion: 0,
        answers: {},
        progress: 0,
        assessment: {
          id: 'assessment_123',
          title: 'JavaScript Fundamentals Assessment',
          description: 'Test your JavaScript knowledge with this comprehensive assessment',
          duration: 60,
          passingScore: 70,
          totalQuestions: 20,
          status: 'published',
          type: 'quiz',
          difficulty: 'intermediate',
          tags: ['javascript', 'programming', 'fundamentals'],
          createdBy: 'user_456',
          createdAt: '2024-01-10T10:30:00Z',
          updatedAt: '2024-01-15T14:20:00Z',
          organizationId: 'org_789',
        },
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            text: 'What is the output of: console.log(typeof null)?',
            options: [
              { id: '1', text: 'null', isCorrect: false },
              { id: '2', text: 'undefined', isCorrect: false },
              { id: '3', text: 'object', isCorrect: true },
              { id: '4', text: 'string', isCorrect: false },
            ],
            points: 5,
            required: true,
            explanation: 'In JavaScript, typeof null returns "object". This is a known language querk.',
          },
          {
            id: 'q2',
            type: 'multiple_choice',
            text: 'Which method is used to add an element to the end of an array?',
            options: [
              { id: '1', text: 'push()', isCorrect: true },
              { id: '2', text: 'pop()', isCorrect: false },
              { id: '3', text: 'shift()', isCorrect: false },
              { id: '4', text: 'unshift()', isCorrect: false },
            ],
            points: 5,
            required: true,
            explanation: 'The push() method adds one or more elements to the end of an array.',
          },
        ],
      },
      fromMock: true,
    },
    'getAssessmentProgress': {
      success: true,
      data: {
        sessionId: 'session_12345',
        currentQuestion: 1,
        answers: { 0: 'object' },
        timeSpent: 900, // 15 minutes in seconds
        lastSaved: '2024-01-15T10:45:00Z',
        bookmarkedQuestions: [],
        flaggedQuestions: [],
      },
      fromMock: true,
    },
    'submitAssessment': {
      success: true,
      data: {
        id: 'response_789',
        assessmentId: 'assessment_123',
        sessionId: 'session_12345',
        userId: 'user_456',
        score: 85,
        totalPoints: 100,
        percentage: 85,
        status: 'completed',
        submittedAt: '2024-01-15T11:30:00Z',
        timeTaken: 45, // minutes
        passed: true,
        feedback: 'Great job! You demonstrated strong JavaScript fundamentals.',
        answers: {
          0: { questionId: 'q1', answer: 'object', correct: true, points: 5 },
          1: { questionId: 'q2', answer: 'push()', correct: true, points: 5 },
        },
      },
      fromMock: true,
    },
  };

  return mockData[endpoint] || { success: true, data: {}, fromMock: true };
};

// ==================== ASSESSMENT HELPER FUNCTIONS ====================

/**
 * Calculate assessment progress percentage
 * @param {number} currentQuestion - Current question index
 * @param {number} totalQuestions - Total number of questions
 * @returns {number} Progress percentage
 */
export const calculateProgressPercentage = (currentQuestion, totalQuestions) => {
  if (!totalQuestions || totalQuestions === 0) return 0;
  return Math.round(((currentQuestion + 1) / totalQuestions) * 100);
};

/**
 * Format assessment duration
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 
    ? `${hours}h ${remainingMinutes}min` 
    : `${hours}h`;
};

/**
 * Get assessment difficulty color
 * @param {string} difficulty - Difficulty level
 * @returns {string} Color code
 */
export const getDifficultyColor = (difficulty) => {
  const colors = {
    beginner: '#4caf50', // green
    easy: '#4caf50', // green
    intermediate: '#ff9800', // orange
    advanced: '#f44336', // red
    expert: '#9c27b0', // purple
  };
  return colors[difficulty?.toLowerCase()] || '#757575'; // default grey
};

/**
 * Check if assessment is available for taking
 * @param {Object} assessment - Assessment object
 * @returns {Object} Availability check result
 */
export const checkAssessmentAvailability = (assessment) => {
  const now = new Date();
  const availability = {
    available: true,
    message: '',
    reason: null,
  };

  if (!assessment) {
    availability.available = false;
    availability.message = 'Assessment not found';
    availability.reason = 'not_found';
    return availability;
  }

  if (assessment.status !== 'published') {
    availability.available = false;
    availability.message = 'This assessment is not published';
    availability.reason = 'not_published';
    return availability;
  }

  if (assessment.startDate && new Date(assessment.startDate) > now) {
    availability.available = false;
    availability.message = `Assessment starts on ${new Date(assessment.startDate).toLocaleDateString()}`;
    availability.reason = 'not_started';
    return availability;
  }

  if (assessment.endDate && new Date(assessment.endDate) < now) {
    availability.available = false;
    availability.message = `Assessment ended on ${new Date(assessment.endDate).toLocaleDateString()}`;
    availability.reason = 'ended';
    return availability;
  }

  return availability;
};

// ==================== SINGLE DEFAULT EXPORT ====================

export default {
  // Session Management (CRITICAL - used by TakeAssessment.jsx)
  startAssessment,
  submitAssessment,
  saveProgress,
  getAssessmentProgress,
  
  // CRUD Operations
  fetchAssessmentById,
  fetchAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  unpublishAssessment,
  updateAssessmentStatus,
  duplicateAssessment,
  
  // Questions
  fetchAssessmentQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  
  // Sessions
  fetchSessionById,
  fetchUserSessions,
  resumeSession,
  validateSession,
  
  // Results
  fetchAssessmentResults,
  fetchUserResult,
  generateReport,
  
  // Analytics
  fetchAssessmentAnalytics,
  fetchQuestionAnalytics,
  
  // Helper Functions
  calculateProgressPercentage,
  formatDuration,
  getDifficultyColor,
  checkAssessmentAvailability,
  
  // Development
  getMockAssessmentData,
};
