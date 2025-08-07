import { getGameState } from '../../_lib/database';
import { getClientIdentifier } from '../../_lib/auth';
import { formatGameState } from '../../_lib/types';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { APIError } from '../../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const gameState = await getGameState(gameId);
    
    res.json({
      success: true,
      gameState: formatGameState(gameState)
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