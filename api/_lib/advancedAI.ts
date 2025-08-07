// Advanced AI system with psychological warfare and strategic behaviors
import type { Player } from './types';
import { GAME_LEVELS } from './levelSystem';

export interface GameBoard {
  grid: (Player | null)[];
  size: number;
}

export interface AIMove {
  position: number;
  confidence: number; // 0-1, how confident the AI is in this move
  reasoning: string; // For debugging/analysis
}

export class AdvancedAIPlayer {
  private level: number;
  private optimalPlayPercentage: number;
  private strategy: string;
  private maxDepth: number;
  private moveHistory: number[] = [];
  private opponentMoveHistory: number[] = [];

  constructor(level: number = 1) {
    this.level = level;
    const levelData = GAME_LEVELS[level - 1];
    this.optimalPlayPercentage = levelData.optimalPlayPercentage;
    this.strategy = levelData.aiStrategy;
    this.maxDepth = levelData.aiDepth === Infinity ? 12 : levelData.aiDepth;
  }

  // Method to override AI settings for dynamic difficulty
  public setDynamicSettings(optimalPercentage: number, aiDepth: number, strategy: string): void {
    this.optimalPlayPercentage = optimalPercentage;
    this.strategy = strategy;
    this.maxDepth = aiDepth === Infinity ? 12 : aiDepth;
  }

  public getMove(grid: (Player | null)[], gridSize: number, aiPlayer: Player, humanPlayer: Player): number {
    const board: GameBoard = { grid, size: gridSize };
    
    // Should we play optimally this turn?
    const shouldPlayOptimal = Math.random() * 100 < this.optimalPlayPercentage;
    
    if (shouldPlayOptimal) {
      return this.getOptimalMove(board, aiPlayer, humanPlayer);
    } else {
      return this.getStrategyMove(board, aiPlayer, humanPlayer);
    }
  }

  private getOptimalMove(board: GameBoard, aiPlayer: Player, humanPlayer: Player): number {
    // Use minimax for truly optimal play
    const result = this.minimax(board, 0, true, -Infinity, Infinity, aiPlayer, humanPlayer);
    return result.move || this.getRandomMove(board);
  }

  private getStrategyMove(board: GameBoard, aiPlayer: Player, humanPlayer: Player): number {
    switch (this.strategy) {
      case 'basic':
        return this.getBasicMove(board);
      
      case 'pattern':
        return this.getPatternMove(board, aiPlayer, humanPlayer);
      
      case 'trap':
        return this.getTrapMove(board, aiPlayer, humanPlayer);
      
      case 'defensive':
        return this.getDefensiveMove(board, aiPlayer, humanPlayer);
      
      case 'psychological':
        return this.getPsychologicalMove(board, aiPlayer, humanPlayer);
      
      default:
        return this.getRandomMove(board);
    }
  }

  private getBasicMove(board: GameBoard): number {
    // Level 1: Just pick a random empty square
    return this.getRandomMove(board);
  }

  private getPatternMove(board: GameBoard, aiPlayer: Player, humanPlayer: Player): number {
    // Level 2: Look for basic patterns - complete lines or block obvious threats
    
    // First, check if we can win immediately
    const winMove = this.findImmediateWin(board, aiPlayer);
    if (winMove !== -1) return winMove;
    
    // Second, block immediate threats
    const blockMove = this.findImmediateWin(board, humanPlayer);
    if (blockMove !== -1) return blockMove;
    
    // Otherwise, favor center and corners
    const center = Math.floor(board.size * board.size / 2);
    if (board.grid[center] === null) return center;
    
    // Try corners
    const corners = this.getCorners(board.size);
    const availableCorners = corners.filter(pos => board.grid[pos] === null);
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    return this.getRandomMove(board);
  }

  private getTrapMove(board: GameBoard, aiPlayer: Player, humanPlayer: Player): number {
    // Level 3: Set up winning traps (create multiple threats)
    
    // Check for immediate win
    const winMove = this.findImmediateWin(board, aiPlayer);
    if (winMove !== -1) return winMove;
    
    // Block immediate threats
    const blockMove = this.findImmediateWin(board, humanPlayer);
    if (blockMove !== -1) return blockMove;
    
    // Look for fork opportunities (creating two threats at once)
    const forkMove = this.findForkMove(board, aiPlayer);
    if (forkMove !== -1) return forkMove;
    
    // Block opponent forks
    const blockForkMove = this.findForkMove(board, humanPlayer);
    if (blockForkMove !== -1) return blockForkMove;
    
    // Strategic center/corner play
    return this.getStrategicMove(board);
  }

  private getDefensiveMove(board: GameBoard, aiPlayer: Player, humanPlayer: Player): number {
    // Level 4: Master defensive play - never let opponent win
    
    // Check for immediate win
    const winMove = this.findImmediateWin(board, aiPlayer);
    if (winMove !== -1) return winMove;
    
    // PRIORITY: Block ALL immediate threats
    const blockMove = this.findImmediateWin(board, humanPlayer);
    if (blockMove !== -1) return blockMove;
    
    // Look for double threats we can create
    const forkMove = this.findForkMove(board, aiPlayer);
    if (forkMove !== -1) return forkMove;
    
    // Block any potential forks
    const preventFork = this.preventOpponentFork(board, humanPlayer);
    if (preventFork !== -1) return preventFork;
    
    // Use shallow minimax for strategic play
    const result = this.minimax(board, 0, true, -Infinity, Infinity, aiPlayer, humanPlayer, 3);
    return result.move || this.getStrategicMove(board);
  }

  private getPsychologicalMove(board: GameBoard, aiPlayer: Player, humanPlayer: Player): number {
    // Level 5: Psychological warfare - occasionally make "mistakes" that are actually traps
    
    const moveCount = board.grid.filter(cell => cell !== null).length;
    
    // Early game: Play perfectly to establish dominance
    if (moveCount < 3) {
      return this.getOptimalMove(board, aiPlayer, humanPlayer);
    }
    
    // Mid game: Occasionally make a "mistake" that's actually a trap
    if (moveCount < 6 && Math.random() < 0.15) {
      // Make a move that looks like a mistake but sets up a counter-trap
      const fakeMistakeMove = this.getFakeMistakeMove(board, aiPlayer, humanPlayer);
      if (fakeMistakeMove !== -1) return fakeMistakeMove;
    }
    
    // Otherwise play nearly optimally
    return this.getOptimalMove(board, aiPlayer, humanPlayer);
  }

  private getFakeMistakeMove(board: GameBoard, aiPlayer: Player, humanPlayer: Player): number {
    // Find a move that looks suboptimal but actually sets up a future advantage
    const emptySquares = this.getEmptySquares(board);
    
    for (const move of emptySquares) {
      // Test if this move allows opponent to create a threat
      const testBoard = this.cloneBoard(board);
      testBoard.grid[move] = aiPlayer;
      
      // But check if we can counter their response
      const opponentThreats = this.findAllThreats(testBoard, humanPlayer);
      if (opponentThreats.length === 1) {
        // They have one threat they'll probably take
        const threatMove = opponentThreats[0];
        const counterBoard = this.cloneBoard(testBoard);
        counterBoard.grid[threatMove] = humanPlayer;
        
        // Can we win after they take the bait?
        const counterWin = this.findImmediateWin(counterBoard, aiPlayer);
        if (counterWin !== -1) {
          return move; // This is our "fake mistake"
        }
      }
    }
    
    return -1; // No good fake mistake available
  }

  // Core minimax algorithm with alpha-beta pruning
  private minimax(
    board: GameBoard, 
    depth: number, 
    isMaximizing: boolean, 
    alpha: number, 
    beta: number, 
    aiPlayer: Player, 
    humanPlayer: Player,
    maxDepth: number = this.maxDepth
  ): { score: number; move: number | null } {
    
    const winner = this.checkWinner(board);
    
    // Terminal conditions
    if (winner === aiPlayer) return { score: 10 - depth, move: null };
    if (winner === humanPlayer) return { score: depth - 10, move: null };
    if (winner === 'DRAW' || depth >= maxDepth) return { score: 0, move: null };

    const emptySquares = this.getEmptySquares(board);
    let bestMove = null;

    if (isMaximizing) {
      let maxScore = -Infinity;
      
      for (const square of emptySquares) {
        const newBoard = this.cloneBoard(board);
        newBoard.grid[square] = aiPlayer;
        
        const result = this.minimax(newBoard, depth + 1, false, alpha, beta, aiPlayer, humanPlayer, maxDepth);
        
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
        const newBoard = this.cloneBoard(board);
        newBoard.grid[square] = humanPlayer;
        
        const result = this.minimax(newBoard, depth + 1, true, alpha, beta, aiPlayer, humanPlayer, maxDepth);
        
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

  // Utility functions
  private findImmediateWin(board: GameBoard, player: Player): number {
    const emptySquares = this.getEmptySquares(board);
    
    for (const square of emptySquares) {
      const testBoard = this.cloneBoard(board);
      testBoard.grid[square] = player;
      
      if (this.checkWinner(testBoard) === player) {
        return square;
      }
    }
    
    return -1;
  }

  private findForkMove(board: GameBoard, player: Player): number {
    const emptySquares = this.getEmptySquares(board);
    
    for (const square of emptySquares) {
      const testBoard = this.cloneBoard(board);
      testBoard.grid[square] = player;
      
      // Count how many ways this player can win
      const winMoves = this.findAllThreats(testBoard, player);
      if (winMoves.length >= 2) {
        return square; // This creates a fork
      }
    }
    
    return -1;
  }

  private preventOpponentFork(board: GameBoard, opponent: Player): number {
    const emptySquares = this.getEmptySquares(board);
    
    for (const square of emptySquares) {
      const testBoard = this.cloneBoard(board);
      testBoard.grid[square] = opponent;
      
      const forkMove = this.findForkMove(testBoard, opponent);
      if (forkMove !== -1) {
        return square; // Block this fork setup
      }
    }
    
    return -1;
  }

  private findAllThreats(board: GameBoard, player: Player): number[] {
    const threats: number[] = [];
    const emptySquares = this.getEmptySquares(board);
    
    for (const square of emptySquares) {
      const testBoard = this.cloneBoard(board);
      testBoard.grid[square] = player;
      
      if (this.checkWinner(testBoard) === player) {
        threats.push(square);
      }
    }
    
    return threats;
  }

  private getStrategicMove(board: GameBoard): number {
    const center = Math.floor(board.size * board.size / 2);
    if (board.grid[center] === null) return center;
    
    const corners = this.getCorners(board.size);
    const availableCorners = corners.filter(pos => board.grid[pos] === null);
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }
    
    return this.getRandomMove(board);
  }

  private getCorners(size: number): number[] {
    return [0, size - 1, size * (size - 1), size * size - 1];
  }

  private getRandomMove(board: GameBoard): number {
    const emptySquares = this.getEmptySquares(board);
    return emptySquares[Math.floor(Math.random() * emptySquares.length)];
  }

  private getEmptySquares(board: GameBoard): number[] {
    return board.grid.map((cell, index) => cell === null ? index : -1).filter(index => index !== -1);
  }

  private cloneBoard(board: GameBoard): GameBoard {
    return {
      grid: [...board.grid],
      size: board.size
    };
  }

  private checkWinner(board: GameBoard): Player | 'DRAW' | null {
    const combinations = this.getWinningCombinations(board.size);
    
    for (const combo of combinations) {
      const firstValue = board.grid[combo[0]];
      if (firstValue && combo.every(index => board.grid[index] === firstValue)) {
        return firstValue;
      }
    }
    
    return this.getEmptySquares(board).length === 0 ? 'DRAW' : null;
  }

  private getWinningCombinations(size: number): number[][] {
    const combos: number[][] = [];
    
    // Rows and columns
    for (let i = 0; i < size; i++) {
      combos.push(Array.from({ length: size }, (_, j) => i * size + j)); // Rows
      combos.push(Array.from({ length: size }, (_, j) => j * size + i)); // Columns
    }
    
    // Diagonals
    combos.push(Array.from({ length: size }, (_, i) => i * size + i));
    combos.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
    
    return combos;
  }
}