import express from 'express';
import jwt from 'jsonwebtoken';
// We don't need mongo or stripe here, only mock logic or external AI call

/**
 * Mocks AI scoring logic to fulfill the frontend's requirement.
 * In production, this would call the Gemini API or equivalent.
 */
function mockAiScore(text) {
  // Use the same basic scoring logic defined in the frontend utility as a robust mock
  const lengthScore = Math.min(text.length / 150, 1);
  const keywordScore = ["structure", "analysis", "evidence", "conclusion"].filter(kw => 
    text.toLowerCase().includes(kw)
  ).length / 4;
  
  const totalScore = Math.round((lengthScore * 0.7 + keywordScore * 0.3) * 100);
  
  return {
    score: totalScore,
    feedback: [
      totalScore > 80 ? "AI Analysis: Highly detailed and insightful response." : 
      totalScore > 50 ? "AI Analysis: Solid content, needs better structural evidence." : 
      "AI Analysis: Response is minimal; require more depth."
    ],
    confidence: 0.95 // High confidence since this endpoint is dedicated to scoring
  };
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // 1. Authenticate and Authorize
    // We only need to verify the token is valid for this utility call
    jwt.verify(token, process.env.JWT_SECRET); 
    
    const { text, questionId, assessmentId } = req.body;

    if (!text || !questionId) {
        return res.status(400).json({ message: 'Missing text or question ID in request body.' });
    }
    
    // 2. Perform Scoring
    // NOTE: In a production environment, you would use a robust LLM API call here.
    const result = mockAiScore(text);

    // 3. Return Structured Response
    return res.status(200).json(result);

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }
    
    console.error('AI Scoring Endpoint Error:', error);
    return res.status(500).json({ message: 'Failed to process AI score request.' });
  }
}
