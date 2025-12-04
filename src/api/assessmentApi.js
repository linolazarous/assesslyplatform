// src/api/assessmentApi.js
import api from './axiosConfig';

// ==================== ASSESSMENT CRUD OPERATIONS ====================

/**
 * Fetch assessments with filtering, pagination, and sorting
 * @param {Object} params - Query parameters
 * @param {string} params.organizationId - Organization ID filter
 * @param {string} params.status - Status filter (draft, published, archived, completed)
 * @param {string} params.type - Type filter (quiz, exam, survey, evaluation, test)
 * @param {string} params.category - Category filter
 * @param {string} params.search - Search query (title, description)
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20, max: 100)
 * @param {string} params.sortBy - Sort field (createdAt, updatedAt, title, dueDate)
 * @param {string} params.sortOrder - Sort order (asc, desc)
 * @param {Date} params.startDate - Filter by start date
 * @param {Date} params.endDate - Filter by end date
 * @param {string} params.createdBy - Filter by creator ID
 * @param {Array<string>} params.tags - Filter by tags
 * @returns {Promise} Assessments list with metadata
 */
export const fetchAssessments = async (params = {}) => {
  try {
    // Default parameters
    const defaultParams = {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    
    const mergedParams = { ...defaultParams, ...params };
    
    const response = await api.get('/api/v1/assessments', { params: mergedParams });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching assessments:', error);
    throw error;
  }
};

/**
 * Fetch single assessment by ID with full details
 * @param {string} assessmentId - Assessment ID
 * @param {Object} options - Additional options
 * @param {boolean} options.includeQuestions - Include questions data
 * @param {boolean} options.includeStatistics - Include statistics
 * @param {boolean} options.includeSettings - Include assessment settings
 * @returns {Promise} Assessment details
 */
export const fetchAssessmentById = async (assessmentId, options = {}) => {
  try {
    const params = {};
    if (options.includeQuestions) params.includeQuestions = true;
    if (options.includeStatistics) params.includeStatistics = true;
    if (options.includeSettings) params.includeSettings = true;
    
    const response = await api.get(`/api/v1/assessments/${assessmentId}`, { params });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error fetching assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Create a new assessment
 * @param {Object} assessmentData - Assessment data
 * @param {string} assessmentData.title - Assessment title (required)
 * @param {string} assessmentData.description - Assessment description
 * @param {string} assessmentData.type - Assessment type (quiz, exam, survey, evaluation)
 * @param {string} assessmentData.category - Assessment category
 * @param {Object} assessmentData.settings - Assessment settings
 * @param {Array<string>} assessmentData.tags - Assessment tags
 * @param {Date} assessmentData.dueDate - Due date
 * @param {number} assessmentData.duration - Duration in minutes
 * @param {number} assessmentData.passingScore - Passing score percentage
 * @param {Object} assessmentData.accessControl - Access control settings
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
    console.error(`[AssessmentAPI] Error updating assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Delete assessment
 * @param {string} assessmentId - Assessment ID
 * @param {Object} options - Delete options
 * @param {boolean} options.force - Force delete (skip trash)
 * @returns {Promise} Delete result
 */
export const deleteAssessment = async (assessmentId, options = {}) => {
  try {
    const response = await api.delete(`/api/v1/assessments/${assessmentId}`, {
      params: options,
    });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error deleting assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Duplicate assessment
 * @param {string} assessmentId - Assessment ID to duplicate
 * @param {Object} options - Duplication options
 * @param {string} options.newTitle - New assessment title
 * @param {boolean} options.includeQuestions - Include questions in duplication
 * @param {boolean} options.includeSettings - Include settings in duplication
 * @param {string} options.targetOrganizationId - Target organization ID
 * @returns {Promise} Duplicated assessment
 */
export const duplicateAssessment = async (assessmentId, options = {}) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/duplicate`, options);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error duplicating assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Update assessment status
 * @param {string} assessmentId - Assessment ID
 * @param {string} status - New status (draft, published, archived, completed, canceled)
 * @param {Object} options - Additional options
 * @param {string} options.reason - Status change reason
 * @param {Date} options.effectiveDate - When status becomes effective
 * @returns {Promise} Update result
 */
export const updateAssessmentStatus = async (assessmentId, status, options = {}) => {
  try {
    const payload = { status, ...options };
    const response = await api.patch(`/api/v1/assessments/${assessmentId}/status`, payload);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error updating assessment ${assessmentId} status:`, error);
    throw error;
  }
};

// ==================== ASSESSMENT QUESTIONS MANAGEMENT ====================

/**
 * Fetch assessment questions
 * @param {string} assessmentId - Assessment ID
 * @param {Object} params - Query parameters
 * @returns {Promise} Questions list
 */
export const fetchAssessmentQuestions = async (assessmentId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/assessments/${assessmentId}/questions`, { params });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error fetching questions for assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Add question to assessment
 * @param {string} assessmentId - Assessment ID
 * @param {Object} questionData - Question data
 * @returns {Promise} Added question
 */
export const addAssessmentQuestion = async (assessmentId, questionData) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/questions`, questionData);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error adding question to assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Update assessment question
 * @param {string} assessmentId - Assessment ID
 * @param {string} questionId - Question ID
 * @param {Object} updates - Question updates
 * @returns {Promise} Updated question
 */
export const updateAssessmentQuestion = async (assessmentId, questionId, updates) => {
  try {
    const response = await api.put(`/api/v1/assessments/${assessmentId}/questions/${questionId}`, updates);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error updating question ${questionId} in assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Delete assessment question
 * @param {string} assessmentId - Assessment ID
 * @param {string} questionId - Question ID
 * @returns {Promise} Delete result
 */
export const deleteAssessmentQuestion = async (assessmentId, questionId) => {
  try {
    const response = await api.delete(`/api/v1/assessments/${assessmentId}/questions/${questionId}`);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error deleting question ${questionId} from assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Reorder assessment questions
 * @param {string} assessmentId - Assessment ID
 * @param {Array<Object>} questionOrder - New question order [{id, position}, ...]
 * @returns {Promise} Reorder result
 */
export const reorderAssessmentQuestions = async (assessmentId, questionOrder) => {
  try {
    const response = await api.patch(`/api/v1/assessments/${assessmentId}/questions/reorder`, { order: questionOrder });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error reordering questions for assessment ${assessmentId}:`, error);
    throw error;
  }
};

// ==================== ASSESSMENT RESPONSES & SUBMISSIONS ====================

/**
 * Fetch assessment responses
 * @param {string} assessmentId - Assessment ID
 * @param {Object} params - Query parameters
 * @param {string} params.status - Response status filter
 * @param {string} params.candidateId - Filter by candidate ID
 * @param {Date} params.startDate - Filter by start date
 * @param {Date} params.endDate - Filter by end date
 * @param {boolean} params.includeAnswers - Include answer details
 * @returns {Promise} Responses list
 */
export const fetchAssessmentResponses = async (assessmentId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/assessments/${assessmentId}/responses`, { params });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error fetching responses for assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Fetch single response
 * @param {string} assessmentId - Assessment ID
 * @param {string} responseId - Response ID
 * @param {Object} options - Response options
 * @param {boolean} options.includeAssessment - Include assessment details
 * @param {boolean} options.includeQuestions - Include question details
 * @returns {Promise} Response details
 */
export const fetchAssessmentResponse = async (assessmentId, responseId, options = {}) => {
  try {
    const response = await api.get(`/api/v1/assessments/${assessmentId}/responses/${responseId}`, {
      params: options,
    });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error fetching response ${responseId} for assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Submit assessment response
 * @param {string} assessmentId - Assessment ID
 * @param {Object} responseData - Response data
 * @param {Object} responseData.answers - Answer data
 * @param {string} responseData.candidateId - Candidate ID
 * @param {Object} responseData.metadata - Response metadata
 * @returns {Promise} Submitted response
 */
export const submitAssessmentResponse = async (assessmentId, responseData) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/responses`, responseData);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error submitting response for assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Evaluate assessment response
 * @param {string} assessmentId - Assessment ID
 * @param {string} responseId - Response ID
 * @param {Object} evaluationData - Evaluation data
 * @param {Object} evaluationData.scores - Question scores
 * @param {string} evaluationData.feedback - Overall feedback
 * @param {Object} evaluationData.metadata - Evaluation metadata
 * @returns {Promise} Evaluation result
 */
export const evaluateAssessmentResponse = async (assessmentId, responseId, evaluationData) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/responses/${responseId}/evaluate`, evaluationData);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error evaluating response ${responseId} for assessment ${assessmentId}:`, error);
    throw error;
  }
};

// ==================== ASSESSMENT ANALYTICS & STATISTICS ====================

/**
 * Fetch assessment analytics
 * @param {string} organizationId - Organization ID for multi-tenant filtering
 * @param {Object} options - Analytics options
 * @param {string} options.timeRange - Time range (today, week, month, quarter, year, custom)
 * @param {Array<string>} options.metrics - Metrics to include
 * @param {Date} options.startDate - Custom start date
 * @param {Date} options.endDate - Custom end date
 * @param {Array<string>} options.assessmentIds - Specific assessment IDs
 * @returns {Promise} Analytics data
 */
export const fetchAssessmentAnalytics = async (organizationId, options = {}) => {
  try {
    const params = { organizationId, ...options };
    const response = await api.get('/api/v1/assessment/analytics', { params });
    return response.data;
  } catch (error) {
    console.error('[AssessmentAPI] Error fetching assessment analytics:', error);
    throw error;
  }
};

/**
 * Fetch assessment statistics
 * @param {string} assessmentId - Assessment ID
 * @param {Object} options - Statistics options
 * @param {boolean} options.detailed - Include detailed statistics
 * @param {Array<string>} options.breakdowns - Statistics breakdowns
 * @returns {Promise} Statistics data
 */
export const fetchAssessmentStatistics = async (assessmentId, options = {}) => {
  try {
    const response = await api.get(`/api/v1/assessments/${assessmentId}/statistics`, {
      params: options,
    });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error fetching statistics for assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Fetch assessment leaderboard
 * @param {string} assessmentId - Assessment ID
 * @param {Object} params - Leaderboard parameters
 * @param {number} params.limit - Number of top results
 * @param {string} params.metric - Ranking metric (score, time, accuracy)
 * @returns {Promise} Leaderboard data
 */
export const fetchAssessmentLeaderboard = async (assessmentId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/assessments/${assessmentId}/leaderboard`, { params });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error fetching leaderboard for assessment ${assessmentId}:`, error);
    throw error;
  }
};

// ==================== ASSESSMENT SHARING & COLLABORATION ====================

/**
 * Share assessment via email
 * @param {string} assessmentId - Assessment ID
 * @param {Object} shareData - Share data
 * @param {Array<string>} shareData.emails - Recipient emails
 * @param {string} shareData.message - Custom message
 * @param {Object} shareData.settings - Share settings
 * @returns {Promise} Share result
 */
export const shareAssessment = async (assessmentId, shareData) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/share`, shareData);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error sharing assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Generate assessment invite link
 * @param {string} assessmentId - Assessment ID
 * @param {Object} options - Invite options
 * @param {string} options.role - Invitee role (candidate, assessor, reviewer)
 * @param {Date} options.expiresAt - Link expiration date
 * @param {number} options.maxUses - Maximum number of uses
 * @param {Object} options.metadata - Invite metadata
 * @returns {Promise} Invite link data
 */
export const generateAssessmentInvite = async (assessmentId, options = {}) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/invite`, options);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error generating invite for assessment ${assessmentId}:`, error);
    throw error;
  }
};

// ==================== ASSESSMENT EXPORT & REPORTING ====================

/**
 * Export assessment data
 * @param {string} assessmentId - Assessment ID
 * @param {Object} options - Export options
 * @param {string} options.format - Export format (pdf, excel, csv, json)
 * @param {boolean} options.includeQuestions - Include questions in export
 * @param {boolean} options.includeResponses - Include responses in export
 * @param {boolean} options.includeAnalytics - Include analytics in export
 * @returns {Promise} Export data
 */
export const exportAssessment = async (assessmentId, options = {}) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/export`, options, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error exporting assessment ${assessmentId}:`, error);
    throw error;
  }
};

/**
 * Generate assessment report
 * @param {string} assessmentId - Assessment ID
 * @param {Object} reportConfig - Report configuration
 * @param {string} reportConfig.type - Report type (summary, detailed, comparative)
 * @param {Array<string>} reportConfig.sections - Report sections to include
 * @param {Object} reportConfig.formatting - Report formatting options
 * @returns {Promise} Report data
 */
export const generateAssessmentReport = async (assessmentId, reportConfig = {}) => {
  try {
    const response = await api.post(`/api/v1/assessments/${assessmentId}/report`, reportConfig);
    return response.data;
  } catch (error) {
    console.error(`[AssessmentAPI] Error generating report for assessment ${assessmentId}:`, error);
    throw error;
  }
};

// ==================== MOCK DATA FOR DEVELOPMENT ====================

/**
 * Get mock assessment data for development and testing
 * @param {Object} options - Mock options
 * @param {number} options.count - Number of mock assessments
 * @param {Array<string>} options.statuses - Statuses to include
 * @returns {Promise} Mock assessments
 */
export const getMockAssessments = async (options = {}) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, options.delay || 500));
  
  const count = options.count || 5;
  const statuses = options.statuses || ['draft', 'published', 'archived'];
  
  const mockAssessments = Array.from({ length: count }, (_, index) => {
    const status = statuses[index % statuses.length];
    const types = ['quiz', 'exam', 'survey', 'evaluation', 'test'];
    const type = types[index % types.length];
    
    return {
      id: `assess_${index + 1}`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Assessment ${index + 1}`,
      description: `This is a ${type} assessment for testing purposes. It contains various question types and scenarios.`,
      type,
      status,
      duration: [30, 45, 60, 90, 120][index % 5],
      totalQuestions: [10, 15, 20, 25, 30][index % 5],
      passingScore: type === 'survey' ? null : [60, 70, 75, 80, 85][index % 5],
      createdAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
      updatedAt: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString(),
      organizationId: `org_${(index % 3) + 1}`,
      createdBy: `user_${(index % 5) + 1}`,
      tags: [`${type}`, `test-${index + 1}`, 'development'],
      settings: {
        randomizeQuestions: index % 2 === 0,
        showResults: index % 3 !== 0,
        allowRetake: index % 4 === 0,
        timeLimit: index % 2 === 0,
      },
      statistics: {
        totalResponses: Math.floor(Math.random() * 100),
        averageScore: Math.floor(Math.random() * 30) + 60,
        completionRate: Math.floor(Math.random() * 30) + 70,
      },
    };
  });
  
  return {
    success: true,
    data: mockAssessments,
    meta: {
      total: count,
      page: 1,
      limit: count,
      totalPages: 1,
    },
    timestamp: new Date().toISOString(),
  };
};

// ==================== DEFAULT EXPORTS ====================

export default {
  // CRUD Operations
  fetchAssessments,
  fetchAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  duplicateAssessment,
  updateAssessmentStatus,
  
  // Questions Management
  fetchAssessmentQuestions,
  addAssessmentQuestion,
  updateAssessmentQuestion,
  deleteAssessmentQuestion,
  reorderAssessmentQuestions,
  
  // Responses & Submissions
  fetchAssessmentResponses,
  fetchAssessmentResponse,
  submitAssessmentResponse,
  evaluateAssessmentResponse,
  
  // Analytics & Statistics
  fetchAssessmentAnalytics,
  fetchAssessmentStatistics,
  fetchAssessmentLeaderboard,
  
  // Sharing & Collaboration
  shareAssessment,
  generateAssessmentInvite,
  
  // Export & Reporting
  exportAssessment,
  generateAssessmentReport,
  
  // Development & Testing
  getMockAssessments,
};
