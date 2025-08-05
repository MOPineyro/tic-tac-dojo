import { getGameState } from '../../_lib/database.js';
import { getClientIdentifier } from '../../_lib/auth.js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { APIError } from '../../_lib/types.js';

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<{ success: boolean; gameState: any } | APIError>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    // Get game state
    const gameState = await getGameState(gameId);
    
    // Return game state (public information only)
    const publicGameState = {
      id: gameState.id,
      grid: gameState.grid,
      gridSize: gameState.gridSize,
      currentPlayer: gameState.currentPlayer,
      gameState: gameState.gameState,
      winner: gameState.winner,
      moveCount: gameState.moveCount,
      gameMode: gameState.gameMode,
      difficulty: gameState.difficulty,
      startedAt: gameState.startedAt,
      finishedAt: gameState.finishedAt,
      // Don't expose private player information
      playerCount: gameState.players?.length || 0
    };

    res.json({
      success: true,
      gameState: publicGameState
    });

  } catch (error) {
    console.error('Get game state error:', error);
    
    if (error instanceof Error && error.message === 'Game not found') {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to get game state',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}