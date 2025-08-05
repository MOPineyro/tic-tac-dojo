import { gameCreateRateLimit, checkRateLimit } from '../_lib/ratelimit.js';
import { validateSchema, schemas, sanitizeInput } from '../_lib/validation.js';
import { createGame } from '../_lib/database.js';
import { getClientIdentifier, createAnonymousSession } from '../_lib/auth.js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { CreateGameRequest, CreateGameResponse, APIError, Player, GameState } from '../_lib/types.js';

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<CreateGameResponse | APIError>
) {
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

    const { playerId, gameMode, difficulty = 'medium', gridSize = 3 } = sanitizedBody;

    // Create game data
    const gameData = {
      players: [playerId],
      gameMode,
      difficulty,
      gridSize,
      grid: Array(gridSize * gridSize).fill(null),
      currentPlayer: 'X' as Player,
      gameState: 'waiting' as GameState, // waiting, active, finished
      winner: null,
      moveCount: 0,
      startedAt: null as string | null,
      finishedAt: null as string | null
    };

    // For AI games, add AI player
    if (gameMode === 'ai') {
      gameData.players.push('ai_player');
      gameData.gameState = 'active';
      gameData.startedAt = new Date().toISOString();
    }

    // Create game in Firebase
    const gameId = await createGame(gameData);

    // Return game information
    res.status(201).json({
      success: true,
      gameId,
      gameData: {
        ...gameData,
        id: gameId
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