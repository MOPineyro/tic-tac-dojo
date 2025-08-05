import { validateSchema, sanitizeInput } from '../_lib/validation';
import { getGameState } from '../_lib/database';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { AICalculateRequest, AICalculateResponse, APIError, Player, Difficulty } from '../_lib/types';

// AI Player class with minimax algorithm
class AIPlayer {
  difficulty: Difficulty;
  maxDepth: number;

  constructor(difficulty: Difficulty = 'medium') {
    this.difficulty = difficulty;
    this.maxDepth = this.getMaxDepth(difficulty);
  }

  getMaxDepth(difficulty: Difficulty): number {
    const depths: Record<Difficulty, number> = {
      easy: 2,
      medium: 4, 
      hard: 6,
      impossible: Infinity
    };
    return depths[difficulty] || 4;
  }

  getEmptySquares(grid: (Player | null)[]): number[] {
    return grid
      .map((cell, index) => cell === null ? index : null)
      .filter(index => index !== null) as number[];
  }

  checkWinner(grid: (Player | null)[], gridSize: number): Player | 'DRAW' | null {
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
    const emptySquares = this.getEmptySquares(grid);
    return emptySquares.length === 0 ? 'DRAW' : null;
  }

  minimax(
    grid: (Player | null)[], 
    gridSize: number, 
    depth: number, 
    isMaximizing: boolean, 
    alpha: number = -Infinity, 
    beta: number = Infinity, 
    aiPlayer: Player, 
    humanPlayer: Player
  ): { score: number; move: number | null } {
    const winner = this.checkWinner(grid, gridSize);
    
    // Terminal conditions
    if (winner === aiPlayer) return { score: 10 - depth, move: null };
    if (winner === humanPlayer) return { score: depth - 10, move: null };
    if (winner === 'DRAW' || depth >= this.maxDepth) return { score: 0, move: null };

    const emptySquares = this.getEmptySquares(grid);
    let bestMove: number | null = null;

    if (isMaximizing) {
      let maxScore = -Infinity;
      
      for (const square of emptySquares) {
        const newGrid = [...grid];
        newGrid[square] = aiPlayer;
        
        const result = this.minimax(newGrid, gridSize, depth + 1, false, alpha, beta, aiPlayer, humanPlayer);
        
        if (result.score > maxScore) {
          maxScore = result.score;
          bestMove = square;
        }
        
        alpha = Math.max(alpha, result.score);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      
      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;
      
      for (const square of emptySquares) {
        const newGrid = [...grid];
        newGrid[square] = humanPlayer;
        
        const result = this.minimax(newGrid, gridSize, depth + 1, true, alpha, beta, aiPlayer, humanPlayer);
        
        if (result.score < minScore) {
          minScore = result.score;
          bestMove = square;
        }
        
        beta = Math.min(beta, result.score);
        if (beta <= alpha) break;
      }
      
      return { score: minScore, move: bestMove };
    }
  }

  getMove(grid: (Player | null)[], gridSize: number, aiPlayer: Player, humanPlayer: Player): number | null {
    // Add controlled randomness for easier difficulties
    if (this.difficulty === 'easy' && Math.random() < 0.4) {
      const emptySquares = this.getEmptySquares(grid);
      return emptySquares[Math.floor(Math.random() * emptySquares.length)];
    }
    
    return this.minimax(grid, gridSize, 0, true, -Infinity, Infinity, aiPlayer, humanPlayer).move;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const sanitizedBody = sanitizeInput(req.body);
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

    // Calculate AI move
    const ai = new AIPlayer(gameState.difficulty || difficulty);
    const move = ai.getMove(gameState.grid, gameState.gridSize, aiPlayer, humanPlayer);

    if (move === null || move === undefined) {
      return res.status(400).json({ error: 'No valid moves available' });
    }

    // Return the calculated move
    res.json({
      success: true,
      move,
      difficulty: ai.difficulty,
      reasoning: process.env.NODE_ENV === 'development' ? {
        emptySquares: ai.getEmptySquares(gameState.grid).length,
        maxDepth: ai.maxDepth,
        gridSize: gameState.gridSize
      } : undefined
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