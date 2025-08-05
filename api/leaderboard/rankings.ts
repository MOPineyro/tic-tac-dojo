import { leaderboardRateLimit, checkRateLimit } from '../_lib/ratelimit';
import { initializeFirebase } from '../_lib/database';
import { getClientIdentifier } from '../_lib/auth';
import { GAME_LEVELS } from '../_lib/levelSystem';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { LeaderboardResponse, APIError } from '../_lib/types';

interface RankingEntry {
  rank: number;
  playerId: string;
  playerName: string;
  totalScore: number;
  highestLevel: number;
  levelName: string;
  gamesPlayed: number;
  averageScore: number;
  achievements: string[];
  lastPlayed: string;
  levelProgress: {
    [level: number]: {
      wins: number;
      bestScore: number;
      completed: boolean;
    };
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const { 
      limit = '25', 
      sortBy = 'totalScore',
      level = 'all'
    } = req.query;
    
    const maxLimit = Math.min(parseInt(Array.isArray(limit) ? limit[0] : limit) || 25, 100);
    const sortCriteria = Array.isArray(sortBy) ? sortBy[0] : sortBy;
    const filterLevel = Array.isArray(level) ? level[0] : level;

    // Initialize Firebase connection
    const db = await initializeFirebase();
    
    // Build query based on filters
    let query = db.collection('players')
      .where('gamesPlayed', '>', 0);

    // Apply level filter if specified
    if (filterLevel !== 'all' && !isNaN(parseInt(filterLevel))) {
      const levelNum = parseInt(filterLevel);
      query = query.where('currentLevel', '>=', levelNum);
    }

    // Get players data
    const playersSnapshot = await query.limit(maxLimit * 2).get(); // Get extra to handle sorting

    const rankings: RankingEntry[] = [];

    playersSnapshot.docs.forEach(doc => {
      const playerData = doc.data();
      
      // Skip players with no meaningful progress
      if (!playerData.totalScore || playerData.totalScore <= 0) {
        return;
      }

      // Calculate highest level reached
      let highestLevel = playerData.currentLevel || 1;
      if (playerData.levelProgress) {
        for (let checkLevel = 5; checkLevel >= 1; checkLevel--) {
          if (playerData.levelProgress[checkLevel]?.completed) {
            highestLevel = Math.max(highestLevel, checkLevel);
            break;
          }
        }
      }

      // Skip if level filter doesn't match
      if (filterLevel !== 'all' && !isNaN(parseInt(filterLevel))) {
        const levelNum = parseInt(filterLevel);
        if (highestLevel < levelNum) return;
      }

      // Build level progress summary
      const levelProgress: any = {};
      for (let lvl = 1; lvl <= 5; lvl++) {
        const progress = playerData.levelProgress?.[lvl] || { wins: 0, losses: 0, completed: false };
        levelProgress[lvl] = {
          wins: progress.wins || 0,
          bestScore: progress.bestScore || 0,
          completed: progress.completed || false
        };
      }

      const entry: RankingEntry = {
        rank: 0, // Will be set after sorting
        playerId: playerData.playerId,
        playerName: playerData.playerName || 'Anonymous Player',
        totalScore: playerData.totalScore || 0,
        highestLevel,
        levelName: GAME_LEVELS[highestLevel - 1]?.name || 'Unknown',
        gamesPlayed: playerData.gamesPlayed || 0,
        averageScore: playerData.gamesPlayed > 0 ? 
          Math.floor((playerData.totalScore || 0) / playerData.gamesPlayed) : 0,
        achievements: playerData.achievements || [],
        lastPlayed: playerData.lastActive || playerData.createdAt || new Date().toISOString(),
        levelProgress
      };

      rankings.push(entry);
    });

    // Sort by requested criteria
    switch (sortCriteria) {
      case 'highestLevel':
        rankings.sort((a, b) => {
          if (b.highestLevel !== a.highestLevel) {
            return b.highestLevel - a.highestLevel;
          }
          return b.totalScore - a.totalScore; // Tie-breaker
        });
        break;
      case 'averageScore':
        rankings.sort((a, b) => b.averageScore - a.averageScore);
        break;
      case 'gamesPlayed':
        rankings.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
        break;
      default: // totalScore
        rankings.sort((a, b) => b.totalScore - a.totalScore);
        break;
    }

    // Limit results and add ranks
    const finalRankings = rankings.slice(0, maxLimit).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

    // Prepare response
    const response: LeaderboardResponse = {
      success: true,
      rankings: finalRankings,
      metadata: {
        total: finalRankings.length,
        sortBy: sortCriteria,
        filterLevel: filterLevel !== 'all' ? parseInt(filterLevel) : null,
        generatedAt: new Date().toISOString(),
        availableLevels: GAME_LEVELS.map(level => ({
          level: level.level,
          name: level.name,
          description: level.description
        }))
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Leaderboard rankings error:', error);
    
    const errorResponse: APIError = {
      error: 'Failed to fetch leaderboard rankings',
      message: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        'Internal server error'
    };
    
    res.status(500).json(errorResponse);
  }
}