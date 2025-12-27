// src/api/assessmentApi.js
import api, { TokenManager, trackError } from './index';

/**
 * Assessment API Service
 * Handles all assessment operations
 * Vite + Render + Production Safe
 */

// ==================== SESSION MANAGEMENT ====================

export const startAssessment = async (assessmentId, options = {}) => {
  try {
    if (!options.organizationId) {
      const tenantId = TokenManager.getTenantId();
      if (tenantId) options.organizationId = tenantId;
    }

    return (await api.post(`/assessments/${assessmentId}/start`, options)).data;
  } catch (error) {
    trackError(error, {
      scope: 'startAssessment',
      assessmentId,
    });
    throw error;
  }
};

export const submitAssessment = async (assessmentId, submissionData) => {
  try {
    return (await api.post(`/assessments/${assessmentId}/submit`, submissionData)).data;
  } catch (error) {
    trackError(error, {
      scope: 'submitAssessment',
      assessmentId,
    });
    throw error;
  }
};

export const saveProgress = async (assessmentId, progressData) => {
  try {
    return (await api.post(`/assessments/${assessmentId}/progress`, progressData)).data;
  } catch (error) {
    trackError(error, {
      scope: 'saveProgress',
      assessmentId,
      silent: true,
    });
    return { success: false };
  }
};

export const getAssessmentProgress = async (assessmentId) => {
  try {
    return (await api.get(`/assessments/${assessmentId}/progress`)).data;
  } catch (error) {
    trackError(error, {
      scope: 'getAssessmentProgress',
      assessmentId,
    });
    throw error;
  }
};

// ==================== ASSESSMENT CRUD ====================

export const fetchAssessments = async (params = {}) => {
  try {
    const tenantId = TokenManager.getTenantId();
    if (tenantId && !params.organizationId) {
      params.organizationId = tenantId;
    }

    return (await api.get('/assessments', { params })).data;
  } catch (error) {
    trackError(error, { scope: 'fetchAssessments', params });
    throw error;
  }
};

export const fetchAssessmentById = async (assessmentId) =>
  (await api.get(`/assessments/${assessmentId}`)).data;

export const createAssessment = async (data) => {
  const tenantId = TokenManager.getTenantId();
  if (!data.organizationId && tenantId) {
    data.organizationId = tenantId;
  }

  return (await api.post('/assessments', data)).data;
};

export const updateAssessment = async (assessmentId, updates) =>
  (await api.put(`/assessments/${assessmentId}`, updates)).data;

export const deleteAssessment = async (assessmentId) =>
  (await api.delete(`/assessments/${assessmentId}`)).data;

export const publishAssessment = async (assessmentId) =>
  (await api.post(`/assessments/${assessmentId}/publish`)).data;

export const unpublishAssessment = async (assessmentId) =>
  (await api.post(`/assessments/${assessmentId}/unpublish`)).data;

export const updateAssessmentStatus = async (assessmentId, status) =>
  (await api.put(`/assessments/${assessmentId}/status`, { status })).data;

export const duplicateAssessment = async (assessmentId, options = {}) =>
  (await api.post(`/assessments/${assessmentId}/duplicate`, options)).data;

// ==================== QUESTIONS ====================

export const fetchAssessmentQuestions = async (assessmentId) =>
  (await api.get(`/assessments/${assessmentId}/questions`)).data;

export const addQuestion = async (assessmentId, data) =>
  (await api.post(`/assessments/${assessmentId}/questions`, data)).data;

export const updateQuestion = async (assessmentId, questionId, updates) =>
  (await api.put(`/assessments/${assessmentId}/questions/${questionId}`, updates)).data;

export const deleteQuestion = async (assessmentId, questionId) =>
  (await api.delete(`/assessments/${assessmentId}/questions/${questionId}`)).data;

export const reorderQuestions = async (assessmentId, order) =>
  (await api.put(`/assessments/${assessmentId}/questions/reorder`, { order })).data;

// ==================== SESSIONS ====================

export const fetchSessionById = async (sessionId) =>
  (await api.get(`/assessment-sessions/${sessionId}`)).data;

export const fetchUserSessions = async (params = {}) =>
  (await api.get('/assessment-sessions', { params })).data;

export const resumeSession = async (sessionId) =>
  (await api.post(`/assessment-sessions/${sessionId}/resume`)).data;

export const validateSession = async (sessionId) =>
  (await api.get(`/assessment-sessions/${sessionId}/validate`)).data;

// ==================== RESULTS & ANALYTICS ====================

export const fetchAssessmentResults = async (assessmentId, params = {}) =>
  (await api.get(`/assessments/${assessmentId}/results`, { params })).data;

export const fetchUserResult = async (sessionId) =>
  (await api.get(`/assessment-sessions/${sessionId}/result`)).data;

export const generateReport = async (sessionId, options = {}) =>
  (await api.post(`/assessment-sessions/${sessionId}/report`, options)).data;

export const fetchAssessmentAnalytics = async (assessmentId) =>
  (await api.get(`/assessments/${assessmentId}/analytics`)).data;

export const fetchQuestionAnalytics = async (assessmentId, questionId) =>
  (await api.get(`/assessments/${assessmentId}/questions/${questionId}/analytics`)).data;

// ==================== HELPERS ====================

export const calculateProgressPercentage = (current, total) =>
  total ? Math.round(((current + 1) / total) * 100) : 0;

export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

export const getDifficultyColor = (difficulty) =>
  ({
    beginner: '#4caf50',
    easy: '#4caf50',
    intermediate: '#ff9800',
    advanced: '#f44336',
    expert: '#9c27b0',
  }[difficulty?.toLowerCase()] || '#757575');

export const checkAssessmentAvailability = (assessment) => {
  if (!assessment || assessment.status !== 'published') {
    return { available: false, reason: 'unavailable' };
  }

  const now = new Date();
  if (assessment.startDate && new Date(assessment.startDate) > now)
    return { available: false, reason: 'not_started' };

  if (assessment.endDate && new Date(assessment.endDate) < now)
    return { available: false, reason: 'ended' };

  return { available: true };
};

// ==================== MOCK DATA (DEV ONLY) ====================

export const getMockAssessmentData = async (key) => {
  if (!(import.meta?.env?.DEV)) return null;
  await new Promise(r => setTimeout(r, 300));
  return { success: true, fromMock: true, key };
};

// ==================== DEFAULT EXPORT ====================

export default {
  startAssessment,
  submitAssessment,
  saveProgress,
  getAssessmentProgress,
  fetchAssessments,
  fetchAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  unpublishAssessment,
  updateAssessmentStatus,
  duplicateAssessment,
  fetchAssessmentQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  fetchSessionById,
  fetchUserSessions,
  resumeSession,
  validateSession,
  fetchAssessmentResults,
  fetchUserResult,
  generateReport,
  fetchAssessmentAnalytics,
  fetchQuestionAnalytics,
  calculateProgressPercentage,
  formatDuration,
  getDifficultyColor,
  checkAssessmentAvailability,
  getMockAssessmentData,
};
