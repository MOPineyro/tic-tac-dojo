import { moveRateLimit, checkRateLimit } from '../_lib/ratelimit.js';
import { validateSchema, schemas, sanitizeInput } from '../_lib/validation.js';
import { getGameState, updateGameState } from '../_lib/database.js';
import { verifyPlayerAccess, getClientIdentifier } from '../_lib/auth.js';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GameMoveRequest, GameMoveResponse, APIError, Player, GameState } from '../_lib/types.js';

// Game logic utilities
function checkWinner(grid: (Player | null)[], gridSize: number): Player | 'DRAW' | null {
  const winningCombinations: number[][] = [];
  
  // Generate winning combinations for NxN grid
  for (let i = 0; i < gridSize; i++) {
    // Rows and columns
    winningCombinations.push(Array.from({ length: gridSize }, (_, j) => i * gridSize + j));
    winningCombinations.push(Array.from({ length: gridSize }, (_, j) => j * gridSize + i));
  }
  
  // Diagonals
  winningCombinations.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + i));
  winningCombinations.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + (gridSize - 1 - i)));
  
  for (let combo of winningCombinations) {
    const firstValue = grid[combo[0]];
    if (firstValue && combo.every(index => grid[index] === firstValue)) {
      return firstValue;
    }
  }
  
  // Check for draw
  const emptySquares = grid.filter(cell => cell === null);
  return emptySquares.length === 0 ? 'DRAW' : null;
}

function isValidMove(grid: (Player | null)[], position: number): boolean {
  return position >= 0 && position < grid.length && grid[position] === null;
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<GameMoveResponse | APIError>
) {
  // Only allow PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client identifier for rate limiting
    const identifier = getClientIdentifier(req);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(moveRateLimit, identifier);
    
    // Set rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'Move too quickly' });
    }

    // Sanitize and validate input
    const sanitizedBody = sanitizeInput(req.body);
    const validation = validateSchema(sanitizedBody, schemas.gameMove);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const { gameId, position, playerId, player } = sanitizedBody;

    // Verify player access to this game
    const authorized = await verifyPlayerAccess(gameId, playerId);
    if (!authorized) {
      return res.status(403).json({ error: 'Unauthorized move' });
    }

    // Get current game state
    const gameState = await getGameState(gameId);
    
    // Validate game state
    if (gameState.gameState !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    if (gameState.currentPlayer !== player) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    
    // Validate move position
    if (!isValidMove(gameState.grid, position)) {
      return res.status(400).json({ error: 'Invalid move position' });
    }

    // Make the move
    const newGrid = [...gameState.grid];
    newGrid[position] = player;
    
    // Check for winner
    const winner = checkWinner(newGrid, gameState.gridSize);
    
    // Determine next player
    let nextPlayer: Player = player; // Default to current player
    let newGameState: GameState = 'active';
    
    if (winner) {
      newGameState = 'finished';
      // Keep current player when game ends
    } else {
      // Switch to next player
      if (gameState.gameMode === 'ai') {
        nextPlayer = player === 'X' ? 'O' : 'X';
      } else {
        // For multiplayer, find next player in players array
        nextPlayer = player === 'X' ? 'O' : 'X';
      }
    }

    // Update game state
    const updatedGameData = {
      grid: newGrid,
      currentPlayer: nextPlayer,
      gameState: newGameState,
      winner,
      moveCount: gameState.moveCount + 1,
      finishedAt: winner ? new Date().toISOString() : null
    };

    await updateGameState(gameId, updatedGameData);

    // Return updated game state
    res.json({
      success: true,
      gameState: {
        ...gameState,
        ...updatedGameData
      },
      moveResult: {
        position,
        player,
        winner,
        gameOver: !!winner
      }
    });

  } catch (error) {
    console.error('Move processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process move',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}