// Advanced scoring system for Tic-Tac-Dojo
import { GAME_LEVELS } from './levelSystem';
import type { Player } from './types';

export interface ScoreBreakdown {
  baseScore: number;
  levelMultiplier: number;
  progressBonus: number;
  timeBonus: number;
  moveEfficiencyBonus: number;
  nearWinBonus: number;
  survivalBonus: number;
  timeoutPenalty?: number;
  totalScore: number;
  achievements: string[];
}

export interface GameAnalysis {
  playerMoves: number[];
  aiMoves: number[];
  gameLength: number;
  finalGrid: (Player | null)[];
  gridSize: number;
  winner: Player | 'DRAW' | null;
  threatsCreated: number;
  threatsBlocked: number;
  nearWinPositions: number;
  strategicMoves: number;
}

export class AdvancedScoringSystem {
  
  static calculateGameScore(
    level: number,
    won: boolean,
    gameAnalysis: GameAnalysis,
    timeElapsed: number
  ): ScoreBreakdown {
    const levelData = GAME_LEVELS[level - 1];
    if (!levelData) {
      throw new Error('Invalid level');
    }

    const breakdown: ScoreBreakdown = {
      baseScore: 0,
      levelMultiplier: levelData.scoreMultiplier,
      progressBonus: 0,
      timeBonus: 0,
      moveEfficiencyBonus: 0,
      nearWinBonus: 0,
      survivalBonus: 0,
      totalScore: 0,
      achievements: []
    };

    // Base score calculation
    if (won) {
      breakdown.baseScore = 1000;
      breakdown.achievements.push(`Defeated Level ${level} AI`);
    } else if (gameAnalysis.winner === 'DRAW') {
      breakdown.baseScore = 600;
      breakdown.achievements.push(`Survived Level ${level} AI`);
    } else {
      // Lost but still get points for effort
      breakdown.baseScore = 200;
    }

    // Progress bonus - reward for getting close to winning
    breakdown.progressBonus = this.calculateProgressBonus(gameAnalysis, level);

    // Time bonus - reward quick thinking
    breakdown.timeBonus = this.calculateTimeBonus(timeElapsed, gameAnalysis.gameLength);

    // Move efficiency bonus
    breakdown.moveEfficiencyBonus = this.calculateMoveEfficiency(gameAnalysis);

    // Near-win bonus - reward for creating winning opportunities
    breakdown.nearWinBonus = this.calculateNearWinBonus(gameAnalysis);

    // Survival bonus for higher levels (especially Level 5)
    breakdown.survivalBonus = this.calculateSurvivalBonus(level, gameAnalysis);

    // Calculate total with level multiplier
    const subtotal = breakdown.baseScore + breakdown.progressBonus + 
                    breakdown.timeBonus + breakdown.moveEfficiencyBonus + 
                    breakdown.nearWinBonus + breakdown.survivalBonus;
    
    breakdown.totalScore = Math.floor(subtotal * breakdown.levelMultiplier);

    // Add achievements based on performance
    this.addPerformanceAchievements(breakdown, gameAnalysis, level, won);

    return breakdown;
  }

  private static calculateProgressBonus(analysis: GameAnalysis, level: number): number {
    let bonus = 0;

    // Bonus for creating threats
    bonus += analysis.threatsCreated * 50;

    // Bonus for blocking AI threats
    bonus += analysis.threatsBlocked * 30;

    // Bonus for strategic moves (center, corners in 3x3, key positions in 4x4)
    bonus += analysis.strategicMoves * 25;

    // Special bonus for lasting longer against higher level AIs
    if (level >= 4) {
      bonus += analysis.gameLength * 15; // More points for each move survived
    }

    return bonus;
  }

  private static calculateTimeBonus(timeElapsed: number, gameLength: number): number {
    // Reward quick decisions but don't penalize thoughtful play too much
    const averageTimePerMove = timeElapsed / gameLength;
    
    if (averageTimePerMove < 3000) { // Less than 3 seconds per move
      return 100;
    } else if (averageTimePerMove < 5000) { // Less than 5 seconds per move
      return 50;
    } else if (averageTimePerMove < 10000) { // Less than 10 seconds per move
      return 20;
    }
    
    return 0; // No penalty for taking time
  }

  private static calculateMoveEfficiency(analysis: GameAnalysis): number {
    // Reward fewer moves to achieve the same result
    const maxMoves = analysis.gridSize * analysis.gridSize;
    const moveEfficiency = (maxMoves - analysis.gameLength) / maxMoves;
    
    return Math.floor(moveEfficiency * 200);
  }

  private static calculateNearWinBonus(analysis: GameAnalysis): number {
    // Reward players for getting close to winning
    return analysis.nearWinPositions * 75;
  }

  private static calculateSurvivalBonus(level: number, analysis: GameAnalysis): number {
    if (level < 4) return 0;

    // For Master and Grandmaster levels, reward survival
    const survivalMultiplier = level === 5 ? 30 : 20;
    return analysis.gameLength * survivalMultiplier;
  }

  private static addPerformanceAchievements(
    breakdown: ScoreBreakdown, 
    analysis: GameAnalysis, 
    level: number, 
    won: boolean
  ): void {
    
    if (analysis.threatsCreated >= 3) {
      breakdown.achievements.push('Threat Master');
    }

    if (analysis.threatsBlocked >= 2) {
      breakdown.achievements.push('Defensive Genius');
    }

    if (won && analysis.gameLength <= 5) {
      breakdown.achievements.push('Lightning Victory');
    }

    if (level === 5 && analysis.gameLength >= 10) {
      breakdown.achievements.push('Grandmaster Survivor');
    }

    if (level >= 3 && analysis.winner === 'DRAW') {
      breakdown.achievements.push('Tactical Draw');
    }

    // Special achievements for perfect games
    if (won && analysis.threatsCreated >= 2 && analysis.threatsBlocked >= 1) {
      breakdown.achievements.push('Perfect Strategy');
    }
  }

  // Analyze a completed game to extract performance metrics
  static analyzeGame(
    playerMoves: number[],
    aiMoves: number[],
    finalGrid: (Player | null)[],
    gridSize: number,
    winner: Player | 'DRAW' | null
  ): GameAnalysis {
    
    const gameLength = playerMoves.length + aiMoves.length;
    
    // Analyze threats created and blocked
    const threatsCreated = this.countThreatsCreated(playerMoves, finalGrid, gridSize, 'X');
    const threatsBlocked = this.countThreatsBlocked(playerMoves, aiMoves, gridSize);
    
    // Count near-win positions (two in a row with empty third)
    const nearWinPositions = this.countNearWinPositions(finalGrid, gridSize, 'X');
    
    // Count strategic moves (center, corners, key positions)
    const strategicMoves = this.countStrategicMoves(playerMoves, gridSize);

    return {
      playerMoves,
      aiMoves,
      gameLength,
      finalGrid,
      gridSize,
      winner,
      threatsCreated,
      threatsBlocked,
      nearWinPositions,
      strategicMoves
    };
  }

  private static countThreatsCreated(
    playerMoves: number[], 
    grid: (Player | null)[], 
    gridSize: number, 
    player: Player
  ): number {
    let threats = 0;
    const winningCombos = this.getWinningCombinations(gridSize);
    
    for (const combo of winningCombos) {
      const playerSquares = combo.filter(pos => grid[pos] === player).length;
      const emptySquares = combo.filter(pos => grid[pos] === null).length;
      
      if (playerSquares === 2 && emptySquares === 1) {
        threats++;
      }
    }
    
    return threats;
  }

  private static countThreatsBlocked(
    playerMoves: number[], 
    aiMoves: number[], 
    gridSize: number
  ): number {
    // This is a simplified version - in practice you'd analyze move sequences
    // to see when player moves blocked potential AI wins
    return Math.floor(playerMoves.length * 0.3); // Rough estimate
  }

  private static countNearWinPositions(
    grid: (Player | null)[], 
    gridSize: number, 
    player: Player
  ): number {
    let nearWins = 0;
    const winningCombos = this.getWinningCombinations(gridSize);
    
    for (const combo of winningCombos) {
      const playerSquares = combo.filter(pos => grid[pos] === player).length;
      const emptySquares = combo.filter(pos => grid[pos] === null).length;
      
      if (playerSquares === 1 && emptySquares === 2) {
        nearWins++;
      }
    }
    
    return nearWins;
  }

  private static countStrategicMoves(playerMoves: number[], gridSize: number): number {
    let strategic = 0;
    const center = Math.floor((gridSize * gridSize) / 2);
    const corners = [0, gridSize - 1, gridSize * (gridSize - 1), gridSize * gridSize - 1];
    
    for (const move of playerMoves) {
      if (move === center) strategic++;
      if (corners.includes(move)) strategic++;
    }
    
    return strategic;
  }

  private static getWinningCombinations(gridSize: number): number[][] {
    const combos: number[][] = [];
    
    // Rows and columns
    for (let i = 0; i < gridSize; i++) {
      combos.push(Array.from({ length: gridSize }, (_, j) => i * gridSize + j)); // Rows
      combos.push(Array.from({ length: gridSize }, (_, j) => j * gridSize + i)); // Columns
    }
    
    // Diagonals
    combos.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + i));
    combos.push(Array.from({ length: gridSize }, (_, i) => i * gridSize + (gridSize - 1 - i)));
    
    return combos;
  }
}

// Global leaderboard entry interface
export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  totalScore: number;
  highestLevel: number;
  gamesPlayed: number;
  achievements: string[];
  lastPlayed: string;
  averageScore: number;
  levelProgress: {
    [level: number]: {
      wins: number;
      bestScore: number;
      completed: boolean;
    };
  };
}