import { gameCreateRateLimit, checkRateLimit } from '../_lib/ratelimit';
import { validateSchema, schemas, sanitizeInput } from '../_lib/validation';
import { createGame } from '../_lib/database';
import { getClientIdentifier, createAnonymousSession } from '../_lib/auth';
import { GAME_LEVELS, getCurrentLevel, getDynamicAIDifficulty } from '../_lib/levelSystem';
import { LevelUnlockManager } from '../_lib/levelUnlock';
import { getPlayerData } from '../_lib/database';
import { formatGameState } from '../_lib/types';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { CreateGameRequest, CreateGameResponse, APIError, Player, GameState, GameMode } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client identifier for rate limiting
    const identifier = getClientIdentifier(req);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(gameCreateRateLimit, identifier);
    
    // Set rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'Too many game creation requests' });
    }

    // Sanitize and validate input
    const sanitizedBody = sanitizeInput(req.body);
    const validation = validateSchema(sanitizedBody, schemas.gameCreation);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const { playerId, gameMode, difficulty, gridSize, level } = sanitizedBody;

    // Get player data to determine current level settings
    let playerData;
    try {
      playerData = await getPlayerData(playerId);
    } catch (error) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Use player's current level if no specific level requested
    const targetLevel = level || playerData.currentLevel || 1;
    const levelData = GAME_LEVELS[targetLevel - 1];
    
    if (!levelData) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    // Ensure player has unlocked this level
    if (targetLevel > playerData.currentLevel) {
      return res.status(403).json({ error: 'Level not unlocked yet' });
    }

    // Get timer configuration for this level
    const timerConfig = LevelUnlockManager.getTimerConfig(targetLevel);
    
    // Get current wins for dynamic difficulty (Level 4 specific)
    const currentWins = playerData.levelProgress[targetLevel]?.wins || 0;
    const dynamicDifficulty = getDynamicAIDifficulty(targetLevel, currentWins);
    
    // Create game data using level settings
    const gameData = {
      players: [playerId],
      gameMode: 'ai' as GameMode, // Always AI for level progression
      difficulty: levelData.difficulty,
      gridSize: levelData.gridSize,
      level: targetLevel,
      levelName: levelData.name,
      requiredWins: levelData.requiredWins,
      grid: Array(levelData.gridSize * levelData.gridSize).fill(null),
      currentPlayer: 'X' as Player,
      gameState: 'active' as GameState,
      winner: null,
      moveCount: 0,
      startedAt: null as string | null,
      finishedAt: null as string | null,
      // Timer settings
      totalTimeLimit: timerConfig.totalTimeLimit,
      moveTimeLimit: timerConfig.moveTimeLimit,
      timeRemaining: timerConfig.totalTimeLimit,
      lastMoveTime: new Date().toISOString(),
      // Dynamic AI settings (Level 4 adaptive difficulty)
      aiOptimalPercentage: dynamicDifficulty.optimalPlayPercentage,
      aiDepth: dynamicDifficulty.aiDepth,
      aiStrategy: dynamicDifficulty.aiStrategy,
      currentWins: currentWins
    };

    // For AI games, add AI player
    gameData.players.push('ai_player');
    gameData.startedAt = new Date().toISOString();

    // Create game in Firebase
    const gameId = await createGame(gameData);

    // Return game information
    res.status(201).json({
      success: true,
      gameId,
      gameData: formatGameState({
        ...gameData,
        id: gameId
      }),
      timer: {
        totalTimeLimit: timerConfig.totalTimeLimit,
        moveTimeLimit: timerConfig.moveTimeLimit,
        warningThreshold: timerConfig.warningThreshold,
        timeRemaining: timerConfig.totalTimeLimit
      },
      levelInfo: {
        level: targetLevel,
        name: levelData.name,
        description: levelData.description,
        aiStrategy: dynamicDifficulty.aiStrategy,
        optimalPlayPercentage: dynamicDifficulty.optimalPlayPercentage,
        aiDepth: dynamicDifficulty.aiDepth,
        behaviorDescription: targetLevel >= 3 ? 
          `Adaptive AI - Game ${currentWins + 1}/${levelData.requiredWins}: ${dynamicDifficulty.optimalPlayPercentage}% optimal, strategy: ${dynamicDifficulty.aiStrategy}${targetLevel === 5 && currentWins === 0 ? ' (mercy possible)' : ''}` : 
          levelData.behaviorDescription,
        currentWins: currentWins,
        requiredWins: levelData.requiredWins
      }
    });

  } catch (error) {
    console.error('Game creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create game',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}