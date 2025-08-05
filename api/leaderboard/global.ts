import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase } from '../_lib/database';
import { leaderboardRateLimit, checkRateLimit } from '../_lib/ratelimit';
import { getClientIdentifier } from '../_lib/auth';
import { GAME_LEVELS } from '../_lib/levelSystem';
import type { LeaderboardEntry } from '../_lib/scoring';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
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

    const { limit = 50, offset = 0, sortBy = 'totalScore' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const db = await initializeFirebase();
    
    // Get all players with score data
    const playersSnapshot = await db.collection('players')
      .where('totalScore', '>', 0)
      .orderBy('totalScore', 'desc')
      .limit(limitNum)
      .offset(offsetNum)
      .get();

    const leaderboardEntries: LeaderboardEntry[] = [];

    for (const doc of playersSnapshot.docs) {
      const playerData = doc.data();
      
      // Calculate highest level reached
      let highestLevel = playerData.currentLevel || 1;
      if (playerData.levelProgress) {
        for (let level = 5; level >= 1; level--) {
          if (playerData.levelProgress[level]?.completed) {
            highestLevel = Math.max(highestLevel, level);
            break;
          }
        }
      }

      // Build level progress summary
      const levelProgress: any = {};
      for (let level = 1; level <= 5; level++) {
        const progress = playerData.levelProgress?.[level] || { wins: 0, losses: 0, completed: false };
        levelProgress[level] = {
          wins: progress.wins || 0,
          bestScore: progress.bestScore || 0,
          completed: progress.completed || false
        };
      }

      const entry: LeaderboardEntry = {
        playerId: playerData.playerId,
        playerName: playerData.playerName || 'Anonymous',
        totalScore: playerData.totalScore || 0,
        highestLevel,
        gamesPlayed: playerData.gamesPlayed || 0,
        achievements: playerData.achievements || [],
        lastPlayed: playerData.lastActive || playerData.createdAt,
        averageScore: playerData.gamesPlayed > 0 ? 
          Math.floor((playerData.totalScore || 0) / playerData.gamesPlayed) : 0,
        levelProgress
      };

      leaderboardEntries.push(entry);
    }

    // Sort by requested criteria
    if (sortBy === 'highestLevel') {
      leaderboardEntries.sort((a, b) => {
        if (b.highestLevel !== a.highestLevel) {
          return b.highestLevel - a.highestLevel;
        }
        return b.totalScore - a.totalScore; // Tie-breaker
      });
    } else if (sortBy === 'averageScore') {
      leaderboardEntries.sort((a, b) => b.averageScore - a.averageScore);
    }
    // Default is already sorted by totalScore

    // Add rank information
    const rankedEntries = leaderboardEntries.map((entry, index) => ({
      ...entry,
      rank: offsetNum + index + 1,
      levelName: GAME_LEVELS[entry.highestLevel - 1]?.name || 'Unknown'
    }));

    // Get total player count for pagination
    const totalPlayersSnapshot = await db.collection('players')
      .where('totalScore', '>', 0)
      .get();
    
    const totalPlayers = totalPlayersSnapshot.size;

    res.json({
      success: true,
      leaderboard: rankedEntries,
      pagination: {
        total: totalPlayers,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < totalPlayers
      },
      sortBy,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      error: 'Failed to get leaderboard',
      message: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        'Internal server error'
    });
  }
}