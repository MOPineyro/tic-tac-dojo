// Level unlocking system with admin codes and password challenges
import { GAME_LEVELS } from './levelSystem';
import type { PlayerData } from './types';

export interface UnlockCode {
  level: number;
  code: string;
  type: 'admin' | 'challenge' | 'easter_egg';
  description: string;
  hint?: string;
}

// Admin and challenge codes for level unlocking
export const UNLOCK_CODES: UnlockCode[] = [
  {
    level: 2,
    code: 'DOJO_APPRENTICE',
    type: 'admin',
    description: 'Admin unlock for Apprentice level'
  },
  {
    level: 2,
    code: 'PATTERN_SEEKER',
    type: 'challenge',
    description: 'Challenge code for pattern recognition mastery',
    hint: 'Think about how AI recognizes patterns...'
  },
  {
    level: 3,
    code: 'DOJO_WARRIOR',
    type: 'admin',
    description: 'Admin unlock for Warrior level'
  },
  {
    level: 3,
    code: 'TACTICAL_MIND',
    type: 'challenge',
    description: 'Challenge code for tactical thinking',
    hint: 'What sets traps in the ancient art of war?'
  },
  {
    level: 4,
    code: 'DOJO_MASTER',
    type: 'admin',
    description: 'Admin unlock for Master level'
  },
  {
    level: 4,
    code: 'FORTRESS_BUILDER',
    type: 'challenge',
    description: 'Challenge code for defensive mastery',
    hint: 'The best defense is...'
  },
  {
    level: 5,
    code: 'DOJO_GRANDMASTER',
    type: 'admin',
    description: 'Admin unlock for Grandmaster level'
  },
  {
    level: 5,
    code: 'MIND_GAMES',
    type: 'challenge',
    description: 'Challenge code for psychological warfare',
    hint: 'Sometimes the best move is the one that looks like a mistake...'
  },
  // Easter egg codes
  {
    level: 3,
    code: 'KONAMI_CODE',
    type: 'easter_egg',
    description: 'Classic gaming easter egg',
    hint: 'Up, Up, Down, Down, Left, Right, Left, Right...'
  },
  {
    level: 4,
    code: 'FORTY_TWO',
    type: 'easter_egg',
    description: 'The answer to life, universe, and everything',
    hint: 'Deep Thought computed this...'
  }
];

export interface GameTimer {
  level: number;
  totalTimeLimit: number; // Total game time in seconds
  moveTimeLimit: number;  // Time per move in seconds
  warningThreshold: number; // When to show warning (seconds remaining)
}

// Dynamic timer configuration based on level
export const LEVEL_TIMERS: GameTimer[] = [
  {
    level: 1,
    totalTimeLimit: 180, // 3 minutes - relaxed for learning
    moveTimeLimit: 30,   // 30 seconds per move
    warningThreshold: 60  // Warning at 1 minute left
  },
  {
    level: 2,
    totalTimeLimit: 150, // 2.5 minutes - slightly faster
    moveTimeLimit: 25,   // 25 seconds per move
    warningThreshold: 45  // Warning at 45 seconds left
  },
  {
    level: 3,
    totalTimeLimit: 150, // 2.5 minutes - more relaxed
    moveTimeLimit: 25,   // 25 seconds per move
    warningThreshold: 45  // Warning at 45 seconds left
  },
  {
    level: 4,
    totalTimeLimit: 180, // 3 minutes - 4x4 needs more time
    moveTimeLimit: 30,   // 30 seconds per move for larger grid
    warningThreshold: 60  // Warning at 1 minute left
  },
  {
    level: 5,
    totalTimeLimit: 150, // 2.5 minutes - more pressure for final level
    moveTimeLimit: 25,   // 25 seconds per move for final challenge
    warningThreshold: 45  // Warning at 45 seconds left
  }
];

export class LevelUnlockManager {
  
  static validateUnlockCode(code: string, targetLevel: number): { valid: boolean; unlockInfo?: UnlockCode; error?: string } {
    // Normalize the code (uppercase, trim whitespace)
    const normalizedCode = code.toUpperCase().trim();
    
    // Find matching unlock code
    const unlockCode = UNLOCK_CODES.find(unlock => 
      unlock.code === normalizedCode && unlock.level === targetLevel
    );
    
    if (!unlockCode) {
      return {
        valid: false,
        error: 'Invalid unlock code for this level'
      };
    }
    
    return {
      valid: true,
      unlockInfo: unlockCode
    };
  }
  
  static canUnlockLevel(playerData: PlayerData, targetLevel: number): { canUnlock: boolean; reason?: string } {
    // Check if already unlocked through normal progression
    if (targetLevel <= playerData.currentLevel) {
      return { canUnlock: true };
    }
    
    // Check if trying to unlock too far ahead
    if (targetLevel > playerData.currentLevel + 1) {
      return {
        canUnlock: false,
        reason: `Cannot unlock level ${targetLevel}. You must be at level ${targetLevel - 1} first.`
      };
    }
    
    // Can unlock the next level with a code
    return { canUnlock: true };
  }
  
  static unlockLevelWithCode(
    playerData: PlayerData, 
    targetLevel: number, 
    code: string
  ): { success: boolean; message: string; newCurrentLevel?: number } {
    
    // Validate if level can be unlocked
    const canUnlock = this.canUnlockLevel(playerData, targetLevel);
    if (!canUnlock.canUnlock) {
      return {
        success: false,
        message: canUnlock.reason || 'Cannot unlock this level'
      };
    }
    
    // Validate the unlock code
    const codeValidation = this.validateUnlockCode(code, targetLevel);
    if (!codeValidation.valid) {
      return {
        success: false,
        message: codeValidation.error || 'Invalid unlock code'
      };
    }
    
    const unlockInfo = codeValidation.unlockInfo!;
    
    // Build success message based on unlock type
    let message = '';
    switch (unlockInfo.type) {
      case 'admin':
        message = `Admin unlock successful! Level ${targetLevel} "${GAME_LEVELS[targetLevel - 1].name}" is now available.`;
        break;
      case 'challenge':
        message = `Challenge code accepted! You've proven your understanding. Level ${targetLevel} unlocked!`;
        break;
      case 'easter_egg':
        message = `🎉 Easter egg found! You've discovered a secret path to Level ${targetLevel}!`;
        break;
    }
    
    return {
      success: true,
      message,
      newCurrentLevel: targetLevel
    };
  }
  
  static getTimerConfig(level: number): GameTimer {
    return LEVEL_TIMERS[level - 1] || LEVEL_TIMERS[4]; // Default to hardest if level > 5
  }
  
  static calculateTimeBonus(timeRemaining: number, totalTimeLimit: number): number {
    // More bonus for finishing quickly
    const timeUsed = totalTimeLimit - timeRemaining;
    const efficiency = timeRemaining / totalTimeLimit;
    
    if (efficiency > 0.7) return 200; // Finished very quickly
    if (efficiency > 0.5) return 150; // Finished quickly  
    if (efficiency > 0.3) return 100; // Finished on time
    if (efficiency > 0.1) return 50;  // Finished with little time left
    return 0; // No bonus for using all time
  }
  
  static getHintsForLevel(level: number): string[] {
    const hints: string[] = [];
    
    // Add relevant hints for the level
    UNLOCK_CODES
      .filter(code => code.level === level && code.hint)
      .forEach(code => {
        if (code.hint) hints.push(code.hint);
      });
    
    return hints;
  }
  
  static getAvailableUnlockMethods(level: number): { adminCodes: number; challengeCodes: number; easterEggs: number } {
    const codes = UNLOCK_CODES.filter(code => code.level === level);
    
    return {
      adminCodes: codes.filter(code => code.type === 'admin').length,
      challengeCodes: codes.filter(code => code.type === 'challenge').length,
      easterEggs: codes.filter(code => code.type === 'easter_egg').length
    };
  }
}