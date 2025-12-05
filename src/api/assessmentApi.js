// src/api/assessmentApi.js
import api from './axiosConfig';

/**
 * Assessment API Service - Complete version
 * Handles all assessment operations for the Assessly Platform
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
    const response = await api.post(`/api/v1/assessments/${assessmentId}/start`, options);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error starting assessment:', error);
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
    const response = await api.post(`/api/v1/assessments/${assessmentId}/submit`, submissionData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error submitting assessment:', error);
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
    const response = await api.post(`/api/v1/assessments/${assessmentId}/progress`, progressData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error saving progress:', error);
    throw error;
  }
};

/**
 * Get assessment progress
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise} Progress data
 */
export const getAssessmentProgress = async (assessmentId) => {
  try {
    const response = await api.get(`/api/v1/assessments/${assessmentId}/progress`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error getting progress:', error);
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
    const response = await api.get('/api/v1/assessments', { params });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching assessments:', error);
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
    const response = await api.get(`/api/v1/assessments/${assessmentId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching assessment:', error);
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
    const response = await api.post('/api/v1/assessments', assessmentData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error creating assessment:', error);
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
    const response = await api.put(`/api/v1/assessments/${assessmentId}`, updates);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error updating assessment:', error);
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
    const response = await api.delete(`/api/v1/assessments/${assessmentId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error deleting assessment:', error);
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
    const response = await api.post(`/api/v1/assessments/${assessmentId}/publish`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error publishing assessment:', error);
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
    const response = await api.post(`/api/v1/assessments/${assessmentId}/unpublish`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error unpublishing assessment:', error);
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
    const response = await api.post(`/api/v1/assessments/${assessmentId}/duplicate`, options);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error duplicating assessment:', error);
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
    const response = await api.get(`/api/v1/assessments/${assessmentId}/questions`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching questions:', error);
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
    const response = await api.post(`/api/v1/assessments/${assessmentId}/questions`, questionData);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error adding question:', error);
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
    const response = await api.put(`/api/v1/assessments/${assessmentId}/questions/${questionId}`, updates);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error updating question:', error);
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
    const response = await api.delete(`/api/v1/assessments/${assessmentId}/questions/${questionId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error deleting question:', error);
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
    const response = await api.put(`/api/v1/assessments/${assessmentId}/questions/reorder`, { order: questionOrder });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error reordering questions:', error);
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
    const response = await api.get(`/api/v1/assessment-sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching session:', error);
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
    const response = await api.get('/api/v1/assessment-sessions', { params });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching user sessions:', error);
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
    const response = await api.post(`/api/v1/assessment-sessions/${sessionId}/resume`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error resuming session:', error);
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
    const response = await api.get(`/api/v1/assessment-sessions/${sessionId}/validate`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error validating session:', error);
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
    const response = await api.get(`/api/v1/assessments/${assessmentId}/results`, { params });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching results:', error);
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
    const response = await api.get(`/api/v1/assessment-sessions/${sessionId}/result`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching user result:', error);
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
    const response = await api.post(`/api/v1/assessment-sessions/${sessionId}/report`, reportOptions);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error generating report:', error);
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
    const response = await api.get(`/api/v1/assessments/${assessmentId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching analytics:', error);
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
    const response = await api.get(`/api/v1/assessments/${assessmentId}/questions/${questionId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching question analytics:', error);
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
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const mockData = {
    'startAssessment': {
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
          explanation: 'In JavaScript, typeof null returns "object". This is a known language quirk.',
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
    'getAssessmentProgress': {
      sessionId: 'session_12345',
      currentQuestion: 1,
      answers: { 0: 'object' },
      timeSpent: 900, // 15 minutes in seconds
      lastSaved: '2024-01-15T10:45:00Z',
      bookmarkedQuestions: [],
      flaggedQuestions: [],
    },
    'submitAssessment': {
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
  };

  return mockData[endpoint] || {};
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
  
  // Development
  getMockAssessmentData,
};
