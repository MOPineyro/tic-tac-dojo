import { validateSchema, sanitizeInput } from '../_lib/validation';
import { getGameState } from '../_lib/database';
import { GAME_LEVELS } from '../_lib/levelSystem';
import { AdvancedAIPlayer } from '../_lib/advancedAI';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AICalculateRequest, AICalculateResponse, APIError, Player } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sanitizedBody = sanitizeInput(req.body);
    
    // Validate request data
    const validation = validateSchema(sanitizedBody, {
      gameId: { type: 'string', required: true, minLength: 1 },
      difficulty: { 
        type: 'string', 
        required: false,
        validate: (value) => !value || ['easy', 'medium', 'hard', 'impossible'].includes(value) || 'Invalid difficulty'
      }
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const { gameId, difficulty = 'medium' } = sanitizedBody;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    // Get current game state
    const gameState = await getGameState(gameId);
    
    // Validate this is an AI game
    if (gameState.gameMode !== 'ai') {
      return res.status(400).json({ error: 'Not an AI game' });
    }
    
    if (gameState.gameState !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    // Determine AI and human players
    const aiPlayer = 'O'; // AI is always O for simplicity
    const humanPlayer = 'X';
    
    if (gameState.currentPlayer !== aiPlayer) {
      return res.status(400).json({ error: 'Not AI turn' });
    }

    // Get level-specific AI settings
    const gameLevel = gameState.level || 1;
    const levelData = GAME_LEVELS[gameLevel - 1];
    
    // Use the advanced AI system
    const advancedAI = new AdvancedAIPlayer(gameLevel);
    const move = advancedAI.getMove(gameState.grid, gameState.gridSize, aiPlayer, humanPlayer);

    if (move === null || move === undefined) {
      return res.status(400).json({ error: 'No valid moves available' });
    }

    // Return the calculated move with AI behavior details
    res.json({
      success: true,
      move,
      aiPlayer,
      level: gameLevel,
      strategy: levelData?.aiStrategy || 'basic',
      optimalPlayPercentage: levelData?.optimalPlayPercentage || 50,
      behaviorDescription: levelData?.behaviorDescription || 'Basic AI behavior',
      explanation: `Level ${gameLevel} AI (${levelData?.name || 'Unknown'}) chose position ${move} using ${levelData?.aiStrategy || 'basic'} strategy`
    });

  } catch (error) {
    console.error('AI move calculation error:', error);
    
    if (error instanceof Error && error.message === 'Game not found') {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to calculate AI move',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}