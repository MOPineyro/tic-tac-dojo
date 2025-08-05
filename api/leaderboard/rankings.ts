import { leaderboardRateLimit, checkRateLimit } from '../_lib/ratelimit.js';
import { initializeFirebase } from '../_lib/database.js';
import { getClientIdentifier } from '../_lib/auth.js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { LeaderboardResponse, APIError } from '../_lib/types.js';

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<LeaderboardResponse | APIError>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client identifier for rate limiting
    const identifier = getClientIdentifier(req);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(leaderboardRateLimit, identifier);
    
    // Set rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'Too many leaderboard requests' });
    }

    const { limit = '10', gameMode = 'all' } = req.query;
    const maxLimit = Math.min(parseInt(Array.isArray(limit) ? limit[0] : limit) || 10, 100); // Cap at 100

    const db = await initializeFirebase();
    
    // For now, get top players by wins
    // In a full implementation, you'd have a proper scoring system
    let query = db.collection('players')
      .orderBy('wins', 'desc')
      .limit(maxLimit);

    const snapshot = await query.get();
    
    const rankings = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: index + 1,
        playerId: data.playerId,
        playerName: data.playerName || 'Anonymous Player',
        wins: data.wins || 0,
        losses: data.losses || 0,
        draws: data.draws || 0,
        gamesPlayed: data.gamesPlayed || 0,
        winRate: data.gamesPlayed > 0 ? 
          ((data.wins || 0) / data.gamesPlayed * 100).toFixed(1) : '0.0',
        lastActive: data.lastActive
      };
    });

    res.json({
      success: true,
      rankings,
      metadata: {
        total: rankings.length,
        gameMode: Array.isArray(gameMode) ? gameMode[0] : gameMode,
        limit: maxLimit,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      error: 'Failed to get leaderboard',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}