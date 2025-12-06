// src/utils/aiScoring.js
/**
 * Enterprise-grade AI scoring utilities for text response evaluation
 * Features caching, fallback algorithms, and comprehensive error handling
 */

// Cache configuration
const SCORING_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
const MAX_CACHE_SIZE = 1000;
const AI_SCORING_TIMEOUT = 30000; // 30 seconds
const MAX_TEXT_LENGTH = 10000; // Character limit for AI scoring

/**
 * Enhanced cache with TTL and LRU eviction
 */
class ScoringCache {
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Set item in cache with TTL
   */
  set(key, data) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
    
    // Update access order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    
    return true;
  }

  /**
   * Get item from cache with access tracking
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return null;
    }
    
    // Check TTL
    if (Date.now() - item.timestamp > SCORING_CACHE_TTL) {
      this.delete(key);
      this.misses++;
      return null;
    }
    
    // Update access stats
    item.accessCount = (item.accessCount || 0) + 1;
    this.hits++;
    
    // Update access order for LRU
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    
    return item.data;
  }

  delete(key) {
    const existed = this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    return existed;
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  size() {
    return this.cache.size;
  }

  stats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? (this.hits / (this.hits + this.misses)).toFixed(4) 
        : 0,
      maxSize: this.maxSize,
      ttl: SCORING_CACHE_TTL
    };
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > SCORING_CACHE_TTL) {
        this.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Initialize cache with periodic cleanup
const scoringCache = new ScoringCache();

// Clean cache every 5 minutes
setInterval(() => {
  const cleaned = scoringCache.cleanup();
  if (cleaned > 0) {
    console.debug(`[AI Scoring] Cleaned ${cleaned} expired cache entries`);
  }
}, 5 * 60 * 1000);

/**
 * Configure AI scoring API client
 */
const createAiScoringApi = (baseURL) => {
  const api = axios.create({
    baseURL: baseURL || import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: AI_SCORING_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
      'X-Client-Platform': 'web'
    }
  });

  // Request interceptor
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add AI-specific headers
      config.headers['X-AI-Scoring-Version'] = '2.1';
      config.headers['X-Request-Source'] = 'assessly-web-ui';
      config.headers['X-Request-ID'] = generateRequestId();
      
      return config;
    },
    (error) => {
      console.error('[AI Scoring] Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  api.interceptors.response.use(
    (response) => {
      // Log successful requests in development
      if (import.meta.env.DEV) {
        console.debug('[AI Scoring] Request successful:', {
          url: response.config.url,
          status: response.status,
          duration: response.headers['x-response-time']
        });
      }
      return response;
    },
    (error) => {
      console.error('[AI Scoring] Request failed:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message
      });
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        console.warn('[AI Scoring] Rate limit exceeded');
        error.isRateLimit = true;
      } else if (error.code === 'ECONNABORTED') {
        console.warn('[AI Scoring] Request timeout');
        error.isTimeout = true;
      } else if (!navigator.onLine) {
        console.warn('[AI Scoring] Network offline');
        error.isOffline = true;
      }
      
      return Promise.reject(error);
    }
  );

  return api;
};

const aiScoringApi = createAiScoringApi();

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
  minScore = 0,
  metadata = {},
  useCache = true,
  abortSignal = null,
  language = 'en'
}) => {
  const startTime = Date.now();
  
  try {
    // Input validation and sanitization
    const validationResult = validateScoringInput({
      text,
      questionId,
      assessmentId,
      maxScore,
      minScore,
      questionType
    });
    
    if (!validationResult.valid) {
      return generateDefaultScore(validationResult.reason, maxScore, minScore);
    }

    const sanitizedText = sanitizeText(text);

    // Check cache
    const cacheKey = generateCacheKey({
      text: sanitizedText,
      questionId,
      assessmentId,
      questionType,
      maxScore,
      minScore,
      language
    });

    if (useCache) {
      const cached = scoringCache.get(cacheKey);
      if (cached) {
        console.debug('[AI Scoring] Cache hit');
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
            cacheHit: true
          }
        };
      }
    }

    // Prepare scoring request
    const scoringRequest = buildScoringRequest({
      text: sanitizedText,
      questionId,
      assessmentId,
      questionText,
      questionType,
      rubric,
      expectedKeywords,
      maxScore,
      minScore,
      metadata,
      language
    });

    // Execute AI scoring with timeout
    const scoringResult = await executeAiScoring(scoringRequest, abortSignal);
    
    // Enrich with additional analysis
    const enrichedResult = enrichScoringResult(scoringResult, sanitizedText, scoringRequest);
    
    // Add timing metadata
    enrichedResult.metadata.processingTime = Date.now() - startTime;
    enrichedResult.metadata.cached = false;
    enrichedResult.metadata.timestamp = new Date().toISOString();

    // Cache successful results with sufficient confidence
    if (useCache && enrichedResult.confidence >= DEFAULT_CONFIDENCE_THRESHOLD) {
      scoringCache.set(cacheKey, enrichedResult);
    }

    return enrichedResult;
  } catch (error) {
    console.error('[AI Scoring] Error:', error);
    
    // Generate fallback score
    const fallbackResult = generateFallbackScore(
      text,
      expectedKeywords,
      maxScore,
      minScore,
      error
    );
    
    fallbackResult.metadata.processingTime = Date.now() - startTime;
    fallbackResult.metadata.error = true;
    fallbackResult.metadata.errorType = error.isRateLimit ? 'rate_limit' : 
                                        error.isTimeout ? 'timeout' : 
                                        error.isOffline ? 'offline' : 'server_error';
    fallbackResult.metadata.errorMessage = error.message;
    
    return fallbackResult;
  }
};

/**
 * Validate scoring input parameters
 */
const validateScoringInput = ({ text, questionId, assessmentId, maxScore, minScore, questionType }) => {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'EMPTY_RESPONSE' };
  }

  const trimmedText = text.trim();
  
  if (trimmedText.length === 0) {
    return { valid: false, reason: 'EMPTY_RESPONSE' };
  }

  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return { valid: false, reason: 'TEXT_TOO_LONG' };
  }

  if (trimmedText.length < 5) {
    return { valid: false, reason: 'INSUFFICIENT_LENGTH' };
  }

  if (!questionId || !assessmentId) {
    return { valid: false, reason: 'MISSING_CONTEXT' };
  }

  if (maxScore <= minScore) {
    return { valid: false, reason: 'INVALID_SCORE_RANGE' };
  }

  if (maxScore > 1000 || minScore < 0) {
    return { valid: false, reason: 'INVALID_SCORE_BOUNDS' };
  }

  const validQuestionTypes = ['text', 'essay', 'short_answer', 'long_answer', 'description'];
  if (!validQuestionTypes.includes(questionType)) {
    return { valid: false, reason: 'INVALID_QUESTION_TYPE' };
  }

  return { valid: true };
};

/**
 * Sanitize text input
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove excessive whitespace
  let sanitized = text.trim();
  
  // Limit length
  if (sanitized.length > MAX_TEXT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_TEXT_LENGTH);
  }
  
  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n');
  
  return sanitized;
};

/**
 * Generate unique cache key
 */
const generateCacheKey = (params) => {
  const { text, questionId, assessmentId, questionType, maxScore, minScore, language } = params;
  
  // Create a stable text representation for caching
  const textForHash = text.length > 200 
    ? `${text.substring(0, 100)}${text.substring(text.length - 100)}`
    : text;
  
  // Simple hash function
  const textHash = stringHash(textForHash.toLowerCase());
  
  return `scoring:${assessmentId}:${questionId}:${questionType}:${maxScore}:${minScore}:${language}:${textHash}`;
};

/**
 * Simple string hash function
 */
const stringHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Build scoring request payload
 */
const buildScoringRequest = ({
  text,
  questionId,
  assessmentId,
  questionText,
  questionType,
  rubric,
  expectedKeywords,
  maxScore,
  minScore,
  metadata,
  language
}) => {
  return {
    text,
    context: {
      questionId,
      assessmentId,
      questionText,
      questionType
    },
    scoring: {
      maxScore,
      minScore,
      rubric: normalizeRubric(rubric),
      expectedKeywords: Array.isArray(expectedKeywords) ? expectedKeywords : [],
      dimensions: {
        contentQuality: { weight: 0.4 },
        relevance: { weight: 0.3 },
        completeness: { weight: 0.2 },
        languageQuality: { weight: 0.1 }
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      language,
      characterCount: text.length,
      hasUnicode: /[^\u0000-\u007F]/.test(text),
      ...metadata
    },
    options: {
      returnBreakdown: true,
      returnFeedback: true,
      returnConfidence: true,
      language
    }
  };
};

/**
 * Execute AI scoring API call
 */
const executeAiScoring = async (scoringRequest, abortSignal) => {
  const config = {
    timeout: AI_SCORING_TIMEOUT
  };
  
  if (abortSignal) {
    config.signal = abortSignal;
  }

  try {
    const response = await aiScoringApi.post('/v1/assessments/ai-score', scoringRequest, config);
    
    if (!response.data) {
      throw new Error('Empty response from AI scoring API');
    }
    
    return processScoringResponse(response.data);
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('AI scoring request timeout');
    }
    if (error.response?.status === 429) {
      throw new Error('AI scoring rate limit exceeded');
    }
    throw error;
  }
};

/**
 * Process and normalize scoring response
 */
const processScoringResponse = (response) => {
  // Extract data from response structure
  const data = response.data || response;
  
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid scoring response format');
  }

  // Validate required fields
  const score = Number(data.score);
  if (isNaN(score) || score < 0) {
    throw new Error('Invalid score in response');
  }

  const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0));
  const feedback = Array.isArray(data.feedback) ? data.feedback : 
                  data.feedback ? [data.feedback] : 
                  ['Scoring completed'];
  
  const breakdown = data.breakdown || {};
  const metadata = data.metadata || {};
  
  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    normalizedScore: data.normalizedScore !== undefined ? Number(data.normalizedScore) : score,
    confidence,
    feedback,
    breakdown,
    metadata: {
      ...metadata,
      modelUsed: data.modelUsed || 'unknown',
      apiVersion: data.apiVersion || '1.0'
    }
  };
};

/**
 * Enrich scoring result with additional analysis
 */
const enrichScoringResult = (scoringResult, text, request) => {
  const textMetrics = analyzeTextMetrics(text);
  const keywordAnalysis = analyzeKeywords(text, request.scoring.expectedKeywords);
  
  return {
    ...scoringResult,
    metrics: {
      ...scoringResult.metrics,
      ...textMetrics,
      ...keywordAnalysis
    },
    suggestions: generateImprovementSuggestions(scoringResult, text, request),
    flags: generateScoringFlags(scoringResult, text),
    formattedScore: formatScoreForDisplay(scoringResult.score),
    scoreCategory: getScoreCategory(scoringResult.score)
  };
};

/**
 * Analyze text metrics
 */
const analyzeTextMetrics = (text) => {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.match(/[.!?]+/g) || [];
  
  return {
    textLength: text.length,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordLength: words.length > 0 ? 
      words.reduce((sum, word) => sum + word.length, 0) / words.length : 0,
    avgSentenceLength: sentences.length > 0 ? words.length / sentences.length : 0,
    readabilityScore: calculateReadabilityScore(text),
    vocabularyDiversity: calculateVocabularyDiversity(text)
  };
};

/**
 * Calculate readability score (Flesch-Kincaid approximation)
 */
const calculateReadabilityScore = (text) => {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = (text.match(/[.!?]+/g) || []).length;
  
  if (words.length === 0 || sentences === 0) return 50;
  
  const avgWordsPerSentence = words.length / sentences;
  const avgSyllablesPerWord = estimateSyllablesPerWord(text);
  
  const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  return Math.max(0, Math.min(100, Math.round(score)));
};

/**
 * Estimate syllables per word
 */
const estimateSyllablesPerWord = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  let totalSyllables = 0;
  let totalWords = 0;
  
  for (const word of words) {
    if (word.length === 0) continue;
    
    const vowelMatches = word.match(/[aeiouy]+/gi);
    const syllables = vowelMatches ? vowelMatches.length : 1;
    
    // Adjust for common patterns
    let adjustedSyllables = syllables;
    if (word.endsWith('e') && syllables > 1) adjustedSyllables--;
    if (word.endsWith('le') && syllables === 1) adjustedSyllables++;
    
    totalSyllables += Math.max(1, adjustedSyllables);
    totalWords++;
  }
  
  return totalWords > 0 ? totalSyllables / totalWords : 0;
};

/**
 * Calculate vocabulary diversity
 */
const calculateVocabularyDiversity = (text) => {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  
  const uniqueWords = new Set(words);
  return (uniqueWords.size / words.length) * 100;
};

/**
 * Analyze keyword usage
 */
const analyzeKeywords = (text, expectedKeywords) => {
  if (!expectedKeywords || expectedKeywords.length === 0) {
    return {
      keywordMatches: 0,
      keywordMatchRate: 0,
      missingKeywords: []
    };
  }
  
  const textLower = text.toLowerCase();
  const matches = expectedKeywords.filter(keyword => 
    textLower.includes(keyword.toLowerCase())
  );
  
  return {
    keywordMatches: matches.length,
    keywordMatchRate: matches.length / expectedKeywords.length,
    matchedKeywords: matches,
    missingKeywords: expectedKeywords.filter(kw => !matches.includes(kw))
  };
};

/**
 * Generate improvement suggestions
 */
const generateImprovementSuggestions = (scoringResult, text, request) => {
  const suggestions = [];
  
  // Content suggestions
  if (scoringResult.score < 70) {
    if (scoringResult.metrics?.keywordMatchRate < 0.5) {
      suggestions.push('Include more relevant keywords from the question');
    }
    
    if (scoringResult.metrics?.textLength < 150) {
      suggestions.push('Provide more detailed explanations and examples');
    }
    
    if (scoringResult.metrics?.readabilityScore < 60) {
      suggestions.push('Improve sentence structure for better clarity');
    }
  }
  
  // Language suggestions
  if (scoringResult.breakdown?.languageQuality < 60) {
    suggestions.push('Review grammar and spelling for improvement');
  }
  
  return suggestions;
};

/**
 * Generate scoring flags
 */
const generateScoringFlags = (scoringResult, text) => {
  const flags = [];
  
  if (scoringResult.confidence < DEFAULT_CONFIDENCE_THRESHOLD) {
    flags.push('LOW_CONFIDENCE');
  }
  
  if (text.length < 50) {
    flags.push('SHORT_RESPONSE');
  }
  
  if (text.length > 5000) {
    flags.push('VERY_LONG_RESPONSE');
  }
  
  if (scoringResult.metrics?.readabilityScore < 30) {
    flags.push('LOW_READABILITY');
  }
  
  return flags;
};

/**
 * Format score for display
 */
const formatScoreForDisplay = (score) => {
  return `${Math.round(score)}/100`;
};

/**
 * Get score category
 */
const getScoreCategory = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Satisfactory';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor';
};

/**
 * Generate fallback score
 */
const generateFallbackScore = (text, expectedKeywords, maxScore, minScore, error) => {
  const basicScore = getBasicTextScore(text, expectedKeywords, maxScore, minScore);
  
  return {
    ...basicScore,
    confidence: 0.5,
    flags: ['FALLBACK_ALGORITHM'],
    metadata: {
      ...basicScore.metadata,
      error: true,
      errorType: 'fallback',
      errorMessage: error?.message || 'AI scoring unavailable',
      fallbackUsed: true
    }
  };
};

/**
 * Basic text scoring algorithm
 */
const getBasicTextScore = (text, expectedKeywords = [], maxScore = 100, minScore = 0) => {
  const sanitizedText = text || '';
  const textLower = sanitizedText.toLowerCase().trim();
  
  if (textLower.length === 0) {
    return generateDefaultScore('EMPTY_RESPONSE', maxScore, minScore);
  }
  
  // Calculate scoring dimensions
  const dimensions = {
    length: calculateLengthScore(textLower, maxScore),
    structure: calculateStructureScore(textLower),
    keywords: calculateKeywordScore(textLower, expectedKeywords),
    readability: calculateReadabilityScore(textLower)
  };
  
  // Weighted average
  const weights = {
    length: 0.3,
    structure: 0.2,
    keywords: 0.4,
    readability: 0.1
  };
  
  const weightedScore = Object.entries(dimensions).reduce((sum, [key, score]) => {
    return sum + (score * weights[key]);
  }, 0);
  
  // Scale to requested range
  const scaledScore = minScore + (weightedScore / 100) * (maxScore - minScore);
  const roundedScore = Math.max(minScore, Math.min(maxScore, Math.round(scaledScore)));
  
  // Generate feedback
  const feedback = [];
  if (dimensions.keywords < 30) feedback.push('Limited use of relevant keywords');
  if (dimensions.structure < 40) feedback.push('Consider improving response structure');
  if (textLower.length < 100) feedback.push('Response could be more detailed');
  
  return {
    score: roundedScore,
    normalizedScore: weightedScore,
    confidence: 0.7,
    feedback: feedback.length > 0 ? feedback : ['Basic scoring complete'],
    breakdown: dimensions,
    metrics: {
      textLength: textLower.length,
      wordCount: textLower.split(/\s+/).filter(w => w.length > 0).length,
      keywordMatches: expectedKeywords.filter(kw => textLower.includes(kw.toLowerCase())).length
    },
    metadata: {
      algorithm: 'basic_fallback',
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Calculate length score
 */
const calculateLengthScore = (text, maxScore) => {
  const length = text.length;
  
  if (length === 0) return 0;
  if (length < 50) return Math.round(maxScore * 0.2);
  if (length < 100) return Math.round(maxScore * 0.4);
  if (length < 200) return Math.round(maxScore * 0.7);
  if (length < 500) return Math.round(maxScore * 0.9);
  if (length < 1000) return Math.round(maxScore * 0.8);
  return Math.round(maxScore * 0.6); // Penalize very long responses
};

/**
 * Calculate structure score
 */
const calculateStructureScore = (text) => {
  const sentences = (text.match(/[.!?]+/g) || []).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  
  if (sentences === 0 || words === 0) return 0;
  
  const avgSentenceLength = words / sentences;
  
  // Optimal sentence length is 15-25 words
  if (avgSentenceLength < 10) return 40;
  if (avgSentenceLength < 15) return 60;
  if (avgSentenceLength < 25) return 80;
  if (avgSentenceLength < 35) return 60;
  return 40;
};

/**
 * Calculate keyword score
 */
const calculateKeywordScore = (text, keywords) => {
  if (!keywords || keywords.length === 0) return 70;
  
  const matches = keywords.filter(keyword => 
    text.includes(keyword.toLowerCase())
  ).length;
  
  return (matches / keywords.length) * 100;
};

/**
 * Generate default score
 */
const generateDefaultScore = (reason, maxScore, minScore) => {
  const defaultScores = {
    EMPTY_RESPONSE: minScore,
    INSUFFICIENT_LENGTH: minScore + (maxScore - minScore) * 0.1,
    TEXT_TOO_LONG: minScore + (maxScore - minScore) * 0.3,
    MISSING_CONTEXT: minScore,
    INVALID_SCORE_RANGE: minScore,
    INVALID_SCORE_BOUNDS: minScore,
    INVALID_QUESTION_TYPE: minScore,
    SCORING_ERROR: minScore,
    BATCH_ERROR: minScore
  };
  
  const score = defaultScores[reason] || minScore;
  
  return {
    score: Math.round(score),
    normalizedScore: score,
    confidence: 1.0,
    feedback: [getDefaultFeedback(reason)],
    breakdown: {},
    metrics: {},
    metadata: {
      defaultScoreReason: reason,
      timestamp: new Date().toISOString()
    },
    flags: [reason]
  };
};

/**
 * Get default feedback message
 */
const getDefaultFeedback = (reason) => {
  const feedbackMap = {
    EMPTY_RESPONSE: 'No response provided',
    INSUFFICIENT_LENGTH: 'Response is too short for meaningful evaluation',
    TEXT_TOO_LONG: 'Response exceeds maximum length for AI scoring',
    MISSING_CONTEXT: 'Missing question or assessment context',
    INVALID_SCORE_RANGE: 'Invalid scoring range specified',
    INVALID_SCORE_BOUNDS: 'Scoring bounds are outside acceptable range',
    INVALID_QUESTION_TYPE: 'Unsupported question type',
    SCORING_ERROR: 'Unable to score response due to technical error',
    BATCH_ERROR: 'Batch scoring failed'
  };
  
  return feedbackMap[reason] || 'Unable to evaluate response';
};

/**
 * Normalize rubric for API
 */
const normalizeRubric = (rubric) => {
  if (!rubric) return null;
  
  if (Array.isArray(rubric)) {
    return rubric.map((item, index) => ({
      id: item.id || `criterion_${index}`,
      name: item.name || item.criterion || item.label || `Criterion ${index + 1}`,
      description: item.description || '',
      weight: Math.max(0.01, Math.min(1, item.weight || 1 / rubric.length)),
      maxScore: item.maxScore || 100
    }));
  }
  
  if (typeof rubric === 'object') {
    return Object.entries(rubric).map(([key, value], index) => ({
      id: `criterion_${index}`,
      name: key,
      description: '',
      weight: typeof value === 'number' ? value : 1,
      maxScore: 100
    }));
  }
  
  return null;
};

/**
 * Batch scoring for multiple responses
 */
export const batchAnalyzeTextResponses = async (responses, options = {}) => {
  const startTime = Date.now();
  const batchOptions = {
    batchSize: 5,
    delayBetweenBatches: 1000,
    useCache: true,
    abortSignal: null,
    ...options
  };

  const results = [];
  const errors = [];
  const stats = {
    total: responses.length,
    cached: 0,
    apiCalls: 0,
    fallbacks: 0
  };

  for (let i = 0; i < responses.length; i += batchOptions.batchSize) {
    const batch = responses.slice(i, i + batchOptions.batchSize);
    
    try {
      const batchPromises = batch.map(response => 
        analyzeTextResponse({
          ...response,
          useCache: batchOptions.useCache,
          abortSignal: batchOptions.abortSignal
        })
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const scoringResult = result.value;
          results.push(scoringResult);
          
          // Update stats
          if (scoringResult.metadata?.cached) {
            stats.cached++;
          } else if (scoringResult.metadata?.fallbackUsed) {
            stats.fallbacks++;
          } else {
            stats.apiCalls++;
          }
        } else {
          const errorIndex = i + index;
          errors.push({
            index: errorIndex,
            error: result.reason.message || 'Unknown error',
            response: responses[errorIndex]
          });
          
          // Add fallback score
          const response = responses[errorIndex];
          results.push(generateDefaultScore('SCORING_ERROR', response.maxScore || 100, 0));
          stats.fallbacks++;
        }
      });

      // Rate limiting delay
      if (i + batchOptions.batchSize < responses.length && batchOptions.delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, batchOptions.delayBetweenBatches));
      }
    } catch (batchError) {
      console.error('[Batch Scoring] Batch failed:', batchError);
      
      // Add default scores for entire failed batch
      for (let j = 0; j < batch.length; j++) {
        errors.push({
          index: i + j,
          error: batchError.message,
          response: batch[j]
        });
        results.push(generateDefaultScore('BATCH_ERROR', batch[j].maxScore || 100, 0));
        stats.fallbacks++;
      }
    }
  }

  return {
    results,
    errors,
    stats: {
      ...stats,
      successful: results.length - errors.length,
      failed: errors.length,
      processingTime: Date.now() - startTime
    },
    cacheStats: scoringCache.stats()
  };
};

/**
 * Clear scoring cache
 */
export const clearScoringCache = (pattern = null) => {
  if (pattern) {
    const keys = Array.from(scoringCache.cache.keys());
    const deleted = keys.filter(key => key.includes(pattern));
    deleted.forEach(key => scoringCache.delete(key));
    return deleted.length;
  } else {
    const size = scoringCache.size();
    scoringCache.clear();
    return size;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return scoringCache.stats();
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
      minScore: question.minScore || 0,
      language: question.language || 'en',
      ...options
    };

    if (!answer || (typeof answer === 'string' && !answer.trim())) {
      return {
        questionId: question.id,
        questionText: questionConfig.questionText,
        ...generateDefaultScore('EMPTY_RESPONSE', questionConfig.maxScore, questionConfig.minScore),
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
        questionText: questionConfig.questionText,
        ...scoringResult,
        answerProvided: true,
        answerLength: typeof answer === 'string' ? answer.length : 0
      };
    } catch (error) {
      console.error(`[Answer Evaluation] Question ${question.id}:`, error);
      
      return {
        questionId: question.id,
        questionText: questionConfig.questionText,
        ...generateFallbackScore(
          typeof answer === 'string' ? answer : '',
          questionConfig.expectedKeywords,
          questionConfig.maxScore,
          questionConfig.minScore,
          error
        ),
        answerProvided: true,
        evaluationError: true
      };
    }
  });

  const results = await Promise.all(scoringPromises);
  
  // Calculate summary statistics
  const validResults = results.filter(r => !r.evaluationError);
  const totalScore = validResults.length > 0 
    ? validResults.reduce((sum, r) => sum + (r.score || 0), 0) / validResults.length
    : 0;
    
  const averageConfidence = validResults.length > 0
    ? validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResults.length
    : 0;
    
  const answeredCount = results.filter(r => r.answerProvided).length;

  const summary = {
    totalScore: Math.round(totalScore),
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    answeredQuestions: answeredCount,
    totalQuestions: questions.length,
    completionRate: Math.round((answeredCount / questions.length) * 100),
    overallFeedback: getOverallFeedback(totalScore),
    processingTime: Date.now() - startTime,
    evaluatedAt: new Date().toISOString(),
    assessmentId
  };

  // Generate recommendations
  const recommendations = generateEvaluationRecommendations(results);

  return {
    results,
    summary,
    recommendations,
    metadata: {
      assessmentId,
      evaluatedAt: summary.evaluatedAt,
      totalProcessingTime: summary.processingTime,
      cacheStats: getCacheStats()
    }
  };
};

/**
 * Generate overall feedback based on score
 */
export const getOverallFeedback = (score) => {
  const feedbackMap = [
    { threshold: 90, feedback: 'Exceptional performance demonstrating comprehensive understanding and insight' },
    { threshold: 80, feedback: 'Strong performance with minor areas for refinement and development' },
    { threshold: 70, feedback: 'Competent performance meeting most expectations and requirements' },
    { threshold: 60, feedback: 'Satisfactory performance with several opportunities for improvement' },
    { threshold: 50, feedback: 'Basic understanding demonstrated - significant development needed' },
    { threshold: 0, feedback: 'Insufficient performance - fundamental concepts require attention and review' }
  ];

  return feedbackMap.find(item => score >= item.threshold)?.feedback || 'Evaluation complete';
};

/**
 * Generate evaluation recommendations
 */
const generateEvaluationRecommendations = (results) => {
  const lowScores = results.filter(r => r.score < 60 && r.answerProvided);
  const lowConfidence = results.filter(r => r.confidence < 0.5 && r.answerProvided);
  const unanswered = results.filter(r => !r.answerProvided).length;
  
  const recommendations = [];
  
  if (lowScores.length > results.length * 0.3) {
    recommendations.push('Consider providing additional training on core concepts');
  }
  
  if (lowConfidence.length > 0) {
    recommendations.push(`${lowConfidence.length} responses require manual review due to low scoring confidence`);
  }
  
  if (unanswered > 0) {
    recommendations.push(`${unanswered} questions were not answered - recommend follow-up`);
  }
  
  // Add specific recommendations based on common issues
  const shortResponses = results.filter(r => r.metrics?.textLength < 50 && r.answerProvided);
  if (shortResponses.length > 0) {
    recommendations.push(`Encourage more detailed responses (${shortResponses.length} very short answers detected)`);
  }
  
  return recommendations;
};

// Type definitions for documentation
/**
 * @typedef {Object} AIScoringResult
 * @property {number} score - Final score (0-100)
 * @property {number} normalizedScore - Raw score before normalization
 * @property {number} confidence - Scoring confidence (0-1)
 * @property {string[]} feedback - Detailed feedback points
 * @property {Object} breakdown - Score breakdown by dimension
 * @property {Object} metrics - Text analysis metrics
 * @property {Object} metadata - Additional scoring metadata
 * @property {string[]} [suggestions] - Improvement suggestions
 * @property {string[]} [flags] - Scoring flags
 * @property {string} [formattedScore] - Formatted score string
 * @property {string} [scoreCategory] - Score category label
 */

/**
 * @typedef {Object} EvaluationResult
 * @property {AIScoringResult[]} results - Individual question results
 * @property {Object} summary - Overall evaluation summary
 * @property {string[]} recommendations - Improvement recommendations
 * @property {Object} metadata - Evaluation metadata
 */

export default {
  analyzeTextResponse,
  batchAnalyzeTextResponses,
  evaluateAnswers,
  clearScoringCache,
  getCacheStats,
  getOverallFeedback,
  ScoringCache // Export for testing
};
