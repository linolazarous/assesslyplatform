// src/utils/aiScoring.jsx
import axios from 'axios';

// Cache configuration
const SCORING_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const MAX_CACHE_SIZE = 1000;

// Enhanced cache with TTL and LRU eviction
class ScoringCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  set(key, data) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Update access order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check TTL
    if (Date.now() - item.timestamp > SCORING_CACHE_TTL) {
      this.delete(key);
      return null;
    }
    
    // Update access order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    
    return item.data;
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }
}

const scoringCache = new ScoringCache();

// Configure AI scoring API client
const aiScoringApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000, // 30 second timeout for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
aiScoringApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add AI-specific headers
    config.headers['X-AI-Scoring-Version'] = '2.0';
    config.headers['X-Request-Source'] = 'web-ui';
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
aiScoringApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      console.warn('[AI Scoring] Rate limit exceeded');
    }
    return Promise.reject(error);
  }
);

/**
 * Enhanced text analysis with multiple scoring dimensions
 * @param {Object} options - Scoring options
 * @returns {Promise<AIScoringResult>}
 */
export const analyzeTextResponse = async ({
  text,
  questionId,
  assessmentId,
  questionText = '',
  questionType = 'text',
  rubric = null,
  expectedKeywords = [],
  maxScore = 100,
  metadata = {},
  useCache = true,
  abortSignal = null
}) => {
  // Input validation
  if (!text?.trim()) {
    return generateDefaultScore('EMPTY_RESPONSE', maxScore);
  }

  if (text.trim().length < 5) {
    return generateDefaultScore('INSUFFICIENT_LENGTH', maxScore);
  }

  // Check cache
  const cacheKey = generateCacheKey({
    text: text.trim().toLowerCase(),
    questionId,
    assessmentId,
    questionType,
    maxScore
  });

  if (useCache) {
    const cached = scoringCache.get(cacheKey);
    if (cached) {
      console.debug('[AI Scoring] Returning cached result');
      return cached;
    }
  }

  try {
    // Prepare scoring request
    const scoringRequest = {
      text: text.trim(),
      questionId,
      assessmentId,
      questionText,
      questionType,
      rubric: normalizeRubric(rubric),
      expectedKeywords,
      maxScore,
      metadata: {
        timestamp: new Date().toISOString(),
        textLength: text.length,
        wordCount: text.trim().split(/\s+/).length,
        characterCount: text.length,
        language: detectLanguage(text),
        hasSpecialCharacters: /[^a-zA-Z0-9\s.,!?;:'"-]/.test(text),
        ...metadata
      },
      scoringDimensions: {
        contentQuality: true,
        grammarSpelling: true,
        relevance: true,
        completeness: true,
        structure: questionType === 'essay',
        keywordUsage: expectedKeywords.length > 0
      }
    };

    const config = abortSignal ? { signal: abortSignal } : {};
    
    const response = await aiScoringApi.post('/v1/assessments/ai-score', scoringRequest, config);
    const scoringResult = processScoringResponse(response.data.data || response.data);

    // Enrich with additional analysis
    const enrichedResult = enrichScoringResult(scoringResult, text, scoringRequest);

    // Cache successful results
    if (useCache && enrichedResult.confidence > DEFAULT_CONFIDENCE_THRESHOLD) {
      scoringCache.set(cacheKey, enrichedResult);
    }

    return enrichedResult;
  } catch (error) {
    console.error('[AI Scoring Error]:', error);
    
    // Generate fallback score with error context
    return generateFallbackScore(text, expectedKeywords, maxScore, error);
  }
};

/**
 * Generate cache key from scoring parameters
 */
const generateCacheKey = (params) => {
  const { text, questionId, assessmentId, questionType, maxScore } = params;
  const textHash = text.length > 100 
    ? `${text.substring(0, 50)}...${text.substring(text.length - 50)}`
    : text;
  
  return `${questionId}:${assessmentId}:${questionType}:${maxScore}:${btoa(textHash).slice(0, 32)}`;
};

/**
 * Process and normalize scoring response
 */
const processScoringResponse = (response) => {
  if (!response) {
    throw new Error('Invalid scoring response');
  }

  const baseResult = {
    score: 0,
    normalizedScore: 0,
    confidence: 0,
    feedback: [],
    breakdown: {},
    metadata: {}
  };

  // Handle different response formats
  if (typeof response === 'object') {
    return {
      ...baseResult,
      score: Math.max(0, Math.min(100, response.score || 0)),
      normalizedScore: response.normalizedScore || response.score || 0,
      confidence: Math.max(0, Math.min(1, response.confidence || 0)),
      feedback: Array.isArray(response.feedback) ? response.feedback : [response.feedback || ''],
      breakdown: response.breakdown || {},
      metadata: response.metadata || {},
      modelUsed: response.modelUsed || 'unknown',
      processingTime: response.processingTime || 0
    };
  }

  // Handle numeric-only response
  if (typeof response === 'number') {
    return {
      ...baseResult,
      score: Math.max(0, Math.min(100, response)),
      normalizedScore: response,
      confidence: 0.7,
      feedback: ['AI scoring completed successfully.'],
      modelUsed: 'legacy'
    };
  }

  throw new Error('Unsupported scoring response format');
};

/**
 * Enrich scoring result with additional analysis
 */
const enrichScoringResult = (scoringResult, text, request) => {
  const enriched = { ...scoringResult };
  
  // Add text analysis metrics
  enriched.metrics = {
    ...enriched.metrics,
    textLength: text.length,
    wordCount: text.trim().split(/\s+/).length,
    sentenceCount: (text.match(/[.!?]+/g) || []).length,
    avgWordLength: calculateAverageWordLength(text),
    readabilityScore: calculateReadabilityScore(text),
    keywordMatchRate: calculateKeywordMatchRate(text, request.expectedKeywords)
  };

  // Add improvement suggestions
  if (enriched.score < 70) {
    enriched.improvementSuggestions = generateImprovementSuggestions(text, enriched);
  }

  // Add grader notes for low confidence
  if (enriched.confidence < DEFAULT_CONFIDENCE_THRESHOLD) {
    enriched.graderNotes = [
      'Low confidence score - recommend human review',
      'Consider providing more specific rubric criteria'
    ];
  }

  // Format score for display
  enriched.formattedScore = formatScoreForDisplay(enriched.score);
  
  return enriched;
};

/**
 * Generate fallback score when AI scoring fails
 */
const generateFallbackScore = (text, expectedKeywords, maxScore, error) => {
  const basicScore = getBasicTextScore(text, expectedKeywords, maxScore);
  
  return {
    ...basicScore,
    confidence: 0.5,
    metadata: {
      ...basicScore.metadata,
      error: true,
      errorMessage: error?.message || 'AI scoring unavailable',
      fallbackUsed: true,
      timestamp: new Date().toISOString()
    },
    graderNotes: ['AI scoring failed - using fallback algorithm']
  };
};

/**
 * Enhanced basic text scoring algorithm
 */
const getBasicTextScore = (text, expectedKeywords = [], maxScore = 100) => {
  const textLower = text.toLowerCase().trim();
  
  if (!textLower || textLower.length < 10) {
    return generateDefaultScore('INSUFFICIENT_LENGTH', maxScore);
  }

  // Calculate multiple dimensions
  const dimensions = {
    length: calculateLengthScore(textLower, maxScore),
    structure: calculateStructureScore(textLower),
    keyword: calculateKeywordScore(textLower, expectedKeywords),
    readability: calculateReadabilityScore(textLower)
  };

  // Weighted scoring
  const weights = {
    length: 0.3,
    structure: 0.2,
    keyword: 0.4,
    readability: 0.1
  };

  const totalScore = Object.entries(dimensions).reduce((sum, [key, score]) => {
    return sum + (score * weights[key]);
  }, 0);

  const normalizedScore = Math.round((totalScore / 100) * maxScore);

  // Generate feedback
  const feedback = [];
  if (dimensions.keyword < 30) feedback.push('Limited use of expected keywords');
  if (dimensions.structure < 40) feedback.push('Consider improving response structure');
  if (dimensions.readability < 50) feedback.push('Response could be more readable');

  return {
    score: normalizedScore,
    normalizedScore: totalScore,
    confidence: 0.8,
    feedback: feedback.length > 0 ? feedback : ['Basic scoring complete'],
    breakdown: dimensions,
    metrics: {
      textLength: text.length,
      wordCount: textLower.split(/\s+/).length,
      keywordMatches: expectedKeywords.filter(kw => textLower.includes(kw.toLowerCase())).length
    }
  };
};

/**
 * Generate default score for edge cases
 */
const generateDefaultScore = (reason, maxScore) => {
  const defaultScores = {
    EMPTY_RESPONSE: 0,
    INSUFFICIENT_LENGTH: Math.round(maxScore * 0.1),
    INVALID_FORMAT: 0
  };

  const score = defaultScores[reason] || 0;
  
  return {
    score,
    normalizedScore: score,
    confidence: 1.0,
    feedback: [getDefaultFeedback(reason)],
    breakdown: {},
    metadata: {
      defaultScoreReason: reason,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Helper functions for scoring calculations
 */
const calculateLengthScore = (text, maxScore) => {
  const optimalLength = 200; // Optimal response length in characters
  const length = text.length;
  
  if (length === 0) return 0;
  if (length < 50) return Math.round(maxScore * 0.1);
  if (length < 100) return Math.round(maxScore * 0.3);
  if (length < 200) return Math.round(maxScore * 0.7);
  if (length < 500) return Math.round(maxScore * 0.9);
  return Math.round(maxScore * 0.8); // Slightly penalize overly long responses
};

const calculateStructureScore = (text) => {
  const sentences = text.match(/[.!?]+/g) || [];
  const words = text.split(/\s+/);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgSentenceLength = words.length / Math.max(1, sentences.length);
  const structureScore = Math.min(100, Math.max(0, 
    100 - Math.abs(avgSentenceLength - 15) * 2 // Penalize sentences too short/long
  ));
  
  return Math.round(structureScore);
};

const calculateKeywordScore = (text, keywords) => {
  if (keywords.length === 0) return 70; // Default score when no keywords specified
  
  const matches = keywords.filter(keyword => 
    text.includes(keyword.toLowerCase())
  ).length;
  
  const matchRate = (matches / keywords.length) * 100;
  return Math.round(matchRate);
};

const calculateAverageWordLength = (text) => {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  
  const totalLength = words.reduce((sum, word) => sum + word.length, 0);
  return totalLength / words.length;
};

const calculateReadabilityScore = (text) => {
  // Simple Flesch-Kincaid grade level approximation
  const words = text.split(/\s+/).length;
  const sentences = (text.match(/[.!?]+/g) || []).length;
  
  if (words === 0 || sentences === 0) return 50;
  
  const avgWordsPerSentence = words / sentences;
  const avgSyllablesPerWord = estimateSyllables(text) / words;
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, score));
};

const estimateSyllables = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  return words.reduce((count, word) => {
    return count + Math.max(1, word.match(/[aeiouy]+/gi)?.length || 0);
  }, 0);
};

const calculateKeywordMatchRate = (text, keywords) => {
  if (!keywords || keywords.length === 0) return 0;
  
  const matches = keywords.filter(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  ).length;
  
  return matches / keywords.length;
};

/**
 * Normalize rubric for API consumption
 */
const normalizeRubric = (rubric) => {
  if (!rubric) return null;
  
  if (Array.isArray(rubric)) {
    return rubric.map(item => ({
      criterion: item.criterion || item.label || 'Untitled',
      weight: Math.max(0, Math.min(1, item.weight || 1 / rubric.length)),
      description: item.description || '',
      maxScore: item.maxScore || 100
    }));
  }
  
  if (typeof rubric === 'object') {
    return Object.entries(rubric).map(([key, value]) => ({
      criterion: key,
      weight: typeof value === 'number' ? value : 1,
      description: '',
      maxScore: 100
    }));
  }
  
  return null;
};

/**
 * Detect language from text
 */
const detectLanguage = (text) => {
  // Simple language detection based on common words
  const englishWords = ['the', 'and', 'for', 'with', 'that'];
  const spanishWords = ['el', 'la', 'de', 'que', 'en'];
  
  const englishMatches = englishWords.filter(word => 
    text.toLowerCase().includes(` ${word} `)
  ).length;
  
  const spanishMatches = spanishWords.filter(word => 
    text.toLowerCase().includes(` ${word} `)
  ).length;
  
  if (englishMatches > spanishMatches) return 'en';
  if (spanishMatches > englishMatches) return 'es';
  return 'unknown';
};

/**
 * Generate improvement suggestions
 */
const generateImprovementSuggestions = (text, scoringResult) => {
  const suggestions = [];
  
  if (scoringResult.breakdown?.structure < 50) {
    suggestions.push('Consider organizing your response with clear paragraphs');
  }
  
  if (scoringResult.metrics?.keywordMatchRate < 0.5) {
    suggestions.push('Try to include more relevant keywords from the question');
  }
  
  if (scoringResult.metrics?.readabilityScore < 60) {
    suggestions.push('Simplify sentence structure for better readability');
  }
  
  if (text.length < 150) {
    suggestions.push('Provide more detail and examples to support your answer');
  }
  
  return suggestions;
};

/**
 * Format score for display
 */
const formatScoreForDisplay = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Satisfactory';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor';
};

/**
 * Get default feedback based on score reason
 */
const getDefaultFeedback = (reason) => {
  const feedbackMap = {
    EMPTY_RESPONSE: 'No response provided',
    INSUFFICIENT_LENGTH: 'Response is too short to evaluate properly',
    INVALID_FORMAT: 'Response format is not supported'
  };
  
  return feedbackMap[reason] || 'Unable to evaluate response';
};

/**
 * Batch scoring for multiple responses
 */
export const batchAnalyzeTextResponses = async (responses, options = {}) => {
  const batchOptions = {
    batchSize: 5,
    delayBetweenBatches: 1000,
    ...options
  };

  const results = [];
  const errors = [];

  for (let i = 0; i < responses.length; i += batchOptions.batchSize) {
    const batch = responses.slice(i, i + batchOptions.batchSize);
    
    try {
      const batchResults = await Promise.allSettled(
        batch.map(response => analyzeTextResponse(response))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            index: i + index,
            error: result.reason
          });
          results.push(generateDefaultScore('SCORING_ERROR', response.maxScore || 100));
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + batchOptions.batchSize < responses.length) {
        await new Promise(resolve => setTimeout(resolve, batchOptions.delayBetweenBatches));
      }
    } catch (error) {
      console.error(`[Batch Scoring Error] Batch ${Math.floor(i / batchOptions.batchSize)}:`, error);
      
      // Add default scores for entire batch
      batch.forEach(() => {
        results.push(generateDefaultScore('BATCH_ERROR', 100));
      });
    }
  }

  return {
    results,
    errors,
    totalProcessed: responses.length,
    successful: results.filter(r => r.confidence > 0.5).length,
    failed: errors.length
  };
};

/**
 * Clear scoring cache
 */
export const clearScoringCache = (pattern = null) => {
  if (pattern) {
    const keys = Array.from(scoringCache.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        scoringCache.delete(key);
      }
    });
  } else {
    scoringCache.clear();
  }
  
  return scoringCache.size();
};

/**
 * Evaluate multiple answers with enhanced scoring
 */
export const evaluateAnswers = async (answers, questions, assessmentId, options = {}) => {
  const startTime = Date.now();
  
  const scoringPromises = questions.map(async (question, index) => {
    const answer = answers[index];
    const questionConfig = {
      questionId: question.id,
      assessmentId,
      questionText: question.text || question.question,
      questionType: question.type || 'text',
      rubric: question.rubric,
      expectedKeywords: question.keywords || [],
      maxScore: question.maxScore || 100,
      ...options
    };

    if (!answer || (typeof answer === 'string' && !answer.trim())) {
      return {
        questionId: question.id,
        ...generateDefaultScore('EMPTY_RESPONSE', questionConfig.maxScore),
        answerProvided: false
      };
    }

    try {
      const scoringResult = await analyzeTextResponse({
        text: typeof answer === 'string' ? answer : JSON.stringify(answer),
        ...questionConfig
      });

      return {
        questionId: question.id,
        ...scoringResult,
        answerProvided: true,
        answerLength: typeof answer === 'string' ? answer.length : 0
      };
    } catch (error) {
      console.error(`[Answer Evaluation Error] Question ${question.id}:`, error);
      
      return {
        questionId: question.id,
        ...generateFallbackScore(
          typeof answer === 'string' ? answer : '',
          questionConfig.expectedKeywords,
          questionConfig.maxScore,
          error
        ),
        answerProvided: true,
        evaluationError: true
      };
    }
  });

  const results = await Promise.all(scoringPromises);
  
  // Calculate overall metrics
  const totalScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
  const averageConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
  const answeredCount = results.filter(r => r.answerProvided).length;

  const evaluationResult = {
    results,
    summary: {
      totalScore: Math.round(totalScore),
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      answeredQuestions: answeredCount,
      totalQuestions: questions.length,
      completionRate: Math.round((answeredCount / questions.length) * 100),
      overallFeedback: getOverallFeedback(totalScore),
      processingTime: Date.now() - startTime,
      evaluatedAt: new Date().toISOString()
    },
    recommendations: generateEvaluationRecommendations(results)
  };

  return evaluationResult;
};

/**
 * Generate overall feedback based on score
 */
export const getOverallFeedback = (score) => {
  if (score >= 90) return 'Exceptional performance demonstrating comprehensive understanding';
  if (score >= 80) return 'Strong performance with minor areas for refinement';
  if (score >= 70) return 'Competent performance meeting most expectations';
  if (score >= 60) return 'Satisfactory performance with several improvement opportunities';
  if (score >= 50) return 'Basic understanding demonstrated - significant development needed';
  return 'Insufficient performance - fundamental concepts require attention';
};

/**
 * Generate evaluation recommendations
 */
const generateEvaluationRecommendations = (results) => {
  const lowScores = results.filter(r => r.score < 60);
  const lowConfidence = results.filter(r => r.confidence < 0.5);
  
  const recommendations = [];
  
  if (lowScores.length > results.length * 0.3) {
    recommendations.push('Consider reviewing fundamental concepts with the candidate');
  }
  
  if (lowConfidence.length > 0) {
    recommendations.push(`${lowConfidence.length} responses require manual review due to low scoring confidence`);
  }
  
  const unanswered = results.filter(r => !r.answerProvided).length;
  if (unanswered > 0) {
    recommendations.push(`${unanswered} questions were not answered - consider following up`);
  }
  
  return recommendations;
};

// Type definitions for better IDE support
/**
 * @typedef {Object} AIScoringResult
 * @property {number} score - Final score (0-100)
 * @property {number} normalizedScore - Raw score before normalization
 * @property {number} confidence - Scoring confidence (0-1)
 * @property {string[]} feedback - Detailed feedback points
 * @property {Object} breakdown - Score breakdown by dimension
 * @property {Object} metrics - Text analysis metrics
 * @property {Object} metadata - Additional scoring metadata
 * @property {string[]} [improvementSuggestions] - Suggestions for improvement
 * @property {string[]} [graderNotes] - Notes for human graders
 * @property {string} [modelUsed] - AI model identifier
 * @property {number} [processingTime] - Processing time in ms
 */

/**
 * @typedef {Object} EvaluationResult
 * @property {Array} results - Individual question results
 * @property {Object} summary - Overall evaluation summary
 * @property {string[]} recommendations - Improvement recommendations
 */

export default {
  analyzeTextResponse,
  batchAnalyzeTextResponses,
  evaluateAnswers,
  clearScoringCache,
  getOverallFeedback
};
