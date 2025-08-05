import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase } from '../_lib/database';
import { validateSchema, sanitizeInput } from '../_lib/validation';
import { leaderboardRateLimit, checkRateLimit } from '../_lib/ratelimit';
import { getClientIdentifier } from '../_lib/auth';
import type { ScoreBreakdown } from '../_lib/scoring';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(leaderboardRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: rateLimitResult.retryAfter 
      });
    }

    const sanitizedBody = sanitizeInput(req.body);
    
    // Validate request data
    const validation = validateSchema(sanitizedBody, {
      playerId: { type: 'string', required: true, minLength: 1 },
      gameId: { type: 'string', required: true, minLength: 1 },
      level: { type: 'number', required: true, min: 1, max: 5 },
      scoreBreakdown: { type: 'object', required: true },
      won: { type: 'boolean', required: true }
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const { playerId, gameId, level, scoreBreakdown, won } = sanitizedBody;

    const db = await initializeFirebase();
    
    // Store detailed score record
    const scoreRecord = {
      playerId,
      gameId,
      level,
      won,
      scoreBreakdown: scoreBreakdown as ScoreBreakdown,
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    };

    // Add to scores collection
    await db.collection('scores').add(scoreRecord);

    // Update player's best score for this level if applicable
    const playerRef = db.collection('players').doc(playerId);
    const playerDoc = await playerRef.get();
    
    if (playerDoc.exists) {
      const playerData = playerDoc.data();
      const currentLevelProgress = playerData?.levelProgress?.[level] || {};
      
      if (!currentLevelProgress.bestScore || scoreBreakdown.totalScore > currentLevelProgress.bestScore) {
        // Update best score for this level
        await playerRef.update({
          [`levelProgress.${level}.bestScore`]: scoreBreakdown.totalScore
        });
      }
    }

    res.json({
      success: true,
      message: 'Score submitted successfully',
      scoreRecord: {
        level,
        score: scoreBreakdown.totalScore,
        achievements: scoreBreakdown.achievements,
        timestamp: scoreRecord.timestamp
      }
    });

  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit score',
      message: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        'Internal server error'
    });
  }
}