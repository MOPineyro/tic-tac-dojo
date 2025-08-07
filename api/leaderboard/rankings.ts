import { leaderboardRateLimit, checkRateLimit } from '../_lib/ratelimit';
import { initializeFirebase } from '../_lib/database';
import { getClientIdentifier } from '../_lib/auth';
import { GAME_LEVELS } from '../_lib/levelSystem';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { LeaderboardResponse, APIError } from '../_lib/types';

/** Admin function to handle cheat reports */
async function handleCheatReports(req: VercelRequest, res: VercelResponse) {
  try {
    const { limit = 20, riskThreshold = 30 } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const riskNum = parseInt(riskThreshold as string) || 30;

    const db = await initializeFirebase();
    
    const reportsSnapshot = await db.collection('cheatReports')
      .where('riskScore', '>=', riskNum)
      .orderBy('riskScore', 'desc')
      .orderBy('timestamp', 'desc')
      .limit(limitNum)
      .get();

    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      gameState: undefined
    }));

    const totalReportsSnapshot = await db.collection('cheatReports').get();
    const highRiskReports = totalReportsSnapshot.docs.filter(doc => 
      (doc.data().riskScore || 0) >= 70
    ).length;

    res.json({
      success: true,
      reports,
      summary: {
        totalReports: totalReportsSnapshot.size,
        highRiskReports,
        reportsPeriod: 'All time',
        threshold: riskNum
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin cheat reports error:', error);
    res.status(500).json({ 
      error: 'Failed to get cheat reports',
      message: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        'Internal server error'
    });
  }
}

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminKey = req.headers['x-admin-key'];
  const isAdmin = adminKey === process.env.ADMIN_KEY;
  
  if (req.query.cheatReports === 'true') {
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return handleCheatReports(req, res);
  }

  try {
    const identifier = getClientIdentifier(req);
    
    const rateLimitResult = await checkRateLimit(leaderboardRateLimit, identifier);
    
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

    const db = await initializeFirebase();
    
    let query = db.collection('players')
      .where('gamesPlayed', '>', 0);

    if (filterLevel !== 'all' && !isNaN(parseInt(filterLevel))) {
      const levelNum = parseInt(filterLevel);
      query = query.where('currentLevel', '>=', levelNum);
    }

    const playersSnapshot = await query.limit(maxLimit * 2).get();

    const rankings: RankingEntry[] = [];

    playersSnapshot.docs.forEach(doc => {
      const playerData = doc.data();
      
      if (!playerData.totalScore || playerData.totalScore <= 0) {
        return;
      }

      let highestLevel = playerData.currentLevel || 1;
      if (playerData.levelProgress) {
        for (let checkLevel = 5; checkLevel >= 1; checkLevel--) {
          if (playerData.levelProgress[checkLevel]?.completed) {
            highestLevel = Math.max(highestLevel, checkLevel);
            break;
          }
        }
      }

      if (filterLevel !== 'all' && !isNaN(parseInt(filterLevel))) {
        const levelNum = parseInt(filterLevel);
        if (highestLevel < levelNum) return;
      }

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
        rank: 0,
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

    switch (sortCriteria) {
      case 'highestLevel':
        rankings.sort((a, b) => {
          if (b.highestLevel !== a.highestLevel) {
            return b.highestLevel - a.highestLevel;
          }
          return b.totalScore - a.totalScore;
        });
        break;
      case 'averageScore':
        rankings.sort((a, b) => b.averageScore - a.averageScore);
        break;
      case 'gamesPlayed':
        rankings.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
        break;
      default:
        rankings.sort((a, b) => b.totalScore - a.totalScore);
        break;
    }

    const finalRankings = rankings.slice(0, maxLimit).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

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