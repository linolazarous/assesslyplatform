import React from 'react'; // Retained React import just in case, though technically unnecessary for pure JS utility

// Cache for similar responses to reduce API calls
const scoringCache = new Map();
const AI_SCORING_ENDPOINT = '/api/assessments/ai-score'; // New standardized API endpoint

/**
 * Analyzes a text response using a standard API endpoint or falls back to basic scoring.
 * @param {string} text - The candidate's response text.
 * @param {string} questionId - ID of the question.
 * @param {string} assessmentId - ID of the assessment.
 * @returns {Promise<{score: number, feedback: string[], confidence: number}>}
 */
export const analyzeTextResponse = async (text, questionId, assessmentId) => {
  try {
    // Check cache first
    const cacheKey = `${questionId}-${text.substring(0, 50)}`;
    if (scoringCache.has(cacheKey)) {
      return scoringCache.get(cacheKey);
    }

    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found');

    // FIX: Replace firebase/functions call with standard fetch to your API endpoint
    const response = await fetch(AI_SCORING_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        text,
        questionId,
        assessmentId,
        metadata: {
          timestamp: new Date().toISOString(),
          length: text.length
        }
      }),
    });
    
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'AI Scoring failed on server.');
    }

    if (!data || typeof data.score !== 'number') {
        throw new Error('AI response structure invalid.');
    }
    
    // Cache the result
    scoringCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('AI Scoring API Error: Falling back to basic score.', error);
    
    // Fallback to basic scoring if API fails
    return getBasicTextScore(text);
  }
};

/**
 * Provides a deterministic, simple score for text based on length and keywords.
 * @param {string} text 
 * @returns {{score: number, feedback: string[], confidence: number}}
 */
const getBasicTextScore = (text) => {
  if (!text || text.length < 10) {
    return {
      score: 0,
      feedback: ['Response too short or missing.'],
      confidence: 0.5
    };
  }

  const keywords = ["experience", "skills", "example", "demonstrate", "achieved"];
  const lengthScore = Math.min(text.length / 100, 1);
  const keywordScore = keywords.filter(kw => 
    text.toLowerCase().includes(kw)
  ).length / keywords.length;
  
  const totalScore = Math.round((lengthScore * 0.6 + keywordScore * 0.4) * 100);
  
  return {
    score: totalScore,
    feedback: [
      totalScore > 75 ? "Excellent detailed response (basic scoring)" : 
      totalScore > 50 ? "Good response with room for improvement (basic scoring)" : 
      totalScore > 25 ? "Basic response - needs more detail (basic scoring)" : "Insufficient response (basic scoring)",
      `Keywords matched: ${Math.round(keywordScore * 100)}%`,
    ],
    confidence: 0.8
  };
};

/**
 * Evaluates a set of answers against questions, using AI for text if available.
 * @param {Object} answers - Array of answers keyed by index.
 * @param {Array<Object>} questions - Array of question objects.
 * @param {string} assessmentId - ID of the assessment.
 * @returns {Promise<Object>} The evaluation results summary.
 */
export const evaluateAnswers = async (answers, questions, assessmentId) => {
  const results = await Promise.all(
    questions.map(async (question, index) => {
      const answer = answers[index];
      const resultBase = { questionId: question.id, score: 0, feedback: [], confidence: 1 };
      
      if (!answer) {
        return { ...resultBase, feedback: ['No response provided'] };
      }

      if (question.type === 'text') {
        return {
          questionId: question.id,
          ...await analyzeTextResponse(answer, question.id, assessmentId)
        };
      }

      const isCorrect = question.correctAnswer === answer;
      return {
        ...resultBase,
        score: isCorrect ? 100 : 0,
        feedback: [isCorrect ? 'Correct answer' : 'Incorrect answer'],
      };
    })
  );
  
  const totalScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const overallFeedback = getOverallFeedback(totalScore);
  
  return { 
    results, 
    totalScore: Math.round(totalScore),
    overallFeedback,
    evaluatedAt: new Date().toISOString()
  };
};

/**
 * Generates high-level feedback based on the total assessment score.
 * @param {number} score 
 * @returns {string}
 */
const getOverallFeedback = (score) => {
  if (score >= 90) return 'Outstanding performance across all areas';
  if (score >= 75) return 'Strong performance with few areas for improvement';
  if (score >= 50) return 'Satisfactory performance with several areas to develop';
  if (score >= 25) return 'Basic understanding demonstrated - needs significant improvement';
  return 'Insufficient responses - substantial development needed';
};
