// Anti-cheat validation system for Tic-Tac-Dojo
import type { Player } from './types';

export interface MoveRecord {
  player: Player;
  position: number;
  timestamp: string;
  moveNumber: number;
  clientId: string;
}

export interface CheatDetectionResult {
  isValid: boolean;
  violations: string[];
  suspiciousActivity: string[];
  riskScore: number; // 0-100, higher = more suspicious
}

export class AntiCheatValidator {
  
  static validateGameIntegrity(
    grid: (Player | null)[],
    moveHistory: MoveRecord[],
    gridSize: number
  ): CheatDetectionResult {
    
    const result: CheatDetectionResult = {
      isValid: true,
      violations: [],
      suspiciousActivity: [],
      riskScore: 0
    };

    // Validate move count consistency
    const gridMoves = grid.filter(cell => cell !== null).length;
    if (gridMoves !== moveHistory.length) {
      result.violations.push(`Move count mismatch: grid has ${gridMoves} moves, history has ${moveHistory.length}`);
      result.isValid = false;
      result.riskScore += 50;
    }

    // Validate alternating players
    for (let i = 0; i < moveHistory.length; i++) {
      const expectedPlayer = i % 2 === 0 ? 'X' : 'O';
      if (moveHistory[i].player !== expectedPlayer) {
        result.violations.push(`Invalid player sequence at move ${i + 1}: expected ${expectedPlayer}, got ${moveHistory[i].player}`);
        result.isValid = false;
        result.riskScore += 30;
      }
    }

    // Validate move positions
    const usedPositions = new Set<number>();
    for (const move of moveHistory) {
      if (move.position < 0 || move.position >= gridSize * gridSize) {
        result.violations.push(`Invalid position ${move.position} in move ${move.moveNumber}`);
        result.isValid = false;
        result.riskScore += 25;
      }

      if (usedPositions.has(move.position)) {
        result.violations.push(`Duplicate move at position ${move.position}`);
        result.isValid = false;
        result.riskScore += 40;
      }
      usedPositions.add(move.position);
    }

    // Validate grid consistency with move history
    const reconstructedGrid = new Array(gridSize * gridSize).fill(null);
    for (const move of moveHistory) {
      if (move.position >= 0 && move.position < reconstructedGrid.length) {
        reconstructedGrid[move.position] = move.player;
      }
    }

    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== reconstructedGrid[i]) {
        result.violations.push(`Grid mismatch at position ${i}: expected ${reconstructedGrid[i]}, got ${grid[i]}`);
        result.isValid = false;
        result.riskScore += 35;
      }
    }

    // Check for suspicious timing patterns
    this.detectTimingAnomalies(moveHistory, result);

    // Check for impossible game states
    this.detectImpossibleStates(grid, gridSize, result);

    return result;
  }

  private static detectTimingAnomalies(moveHistory: MoveRecord[], result: CheatDetectionResult): void {
    if (moveHistory.length < 2) return;

    const moveTimes: number[] = [];
    for (let i = 1; i < moveHistory.length; i++) {
      const timeDiff = new Date(moveHistory[i].timestamp).getTime() - 
                      new Date(moveHistory[i - 1].timestamp).getTime();
      moveTimes.push(timeDiff);
    }

    // Check for impossibly fast moves (< 100ms)
    const fastMoves = moveTimes.filter(time => time < 100).length;
    if (fastMoves > 0) {
      result.suspiciousActivity.push(`${fastMoves} impossibly fast moves detected (< 100ms)`);
      result.riskScore += fastMoves * 10;
    }

    // Check for identical timing patterns (bot behavior)
    const uniqueTimes = new Set(moveTimes.map(t => Math.floor(t / 100) * 100)); // Round to 100ms
    if (moveTimes.length > 3 && uniqueTimes.size === 1) {
      result.suspiciousActivity.push('Identical timing pattern suggests automated play');
      result.riskScore += 20;
    }
  }

  private static detectImpossibleStates(
    grid: (Player | null)[], 
    gridSize: number, 
    result: CheatDetectionResult
  ): void {
    
    const xCount = grid.filter(cell => cell === 'X').length;
    const oCount = grid.filter(cell => cell === 'O').length;
    
    // X should always go first, so X count should be equal to O count or one more
    if (xCount < oCount || xCount > oCount + 1) {
      result.violations.push(`Invalid move count: X=${xCount}, O=${oCount}`);
      result.isValid = false;
      result.riskScore += 45;
    }

    // Check for multiple winners (impossible)
    const winner = this.checkWinner(grid, gridSize);
    if (winner) {
      // If there's a winner, the game should have stopped
      const winnerCount = grid.filter(cell => cell === winner).length;
      const otherPlayer = winner === 'X' ? 'O' : 'X';
      const otherCount = grid.filter(cell => cell === otherPlayer).length;
      
      // Check if the game continued after a win was possible
      const minMovesToWin = gridSize; // Minimum moves needed to win
      if (winnerCount > minMovesToWin && winnerCount - otherCount > 1) {
        result.suspiciousActivity.push('Game may have continued after win condition was met');
        result.riskScore += 15;
      }
    }
  }

  private static checkWinner(grid: (Player | null)[], gridSize: number): Player | 'DRAW' | null {
    const combinations = this.getWinningCombinations(gridSize);
    
    for (const combo of combinations) {
      const firstValue = grid[combo[0]];
      if (firstValue && combo.every(index => grid[index] === firstValue)) {
        return firstValue;
      }
    }
    
    return grid.filter(cell => cell === null).length === 0 ? 'DRAW' : null;
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

  // Validate that a player hasn't exceeded reasonable play rates
  static validatePlayerActivity(
    playerId: string,
    recentGames: number,
    timeWindow: number // in milliseconds
  ): { valid: boolean; message?: string } {
    
    const maxGamesPerHour = 30; // Reasonable limit
    const gamesPerHour = (recentGames * 3600000) / timeWindow;
    
    if (gamesPerHour > maxGamesPerHour) {
      return {
        valid: false,
        message: `Excessive play rate: ${Math.round(gamesPerHour)} games/hour (max: ${maxGamesPerHour})`
      };
    }
    
    return { valid: true };
  }

  // Check for duplicate client IDs (account sharing/automation)
  static detectAccountSharing(moveHistory: MoveRecord[]): string[] {
    const clientIds = moveHistory.map(move => move.clientId);
    const uniqueClients = new Set(clientIds);
    
    const warnings: string[] = [];
    
    if (uniqueClients.size > 1) {
      warnings.push(`Multiple client IDs detected: ${Array.from(uniqueClients).join(', ')}`);
    }
    
    return warnings;
  }
}