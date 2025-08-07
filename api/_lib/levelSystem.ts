// Level progression system for tic-tac-dojo

export interface Level {
  level: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'impossible' | 'master';
  description: string;
  gridSize: number;
  aiDepth: number;
  requiredWins: number; // Number of wins needed to advance
  scoreMultiplier: number;
  unlockMessage: string;
  // Advanced AI behavior
  optimalPlayPercentage: number; // 0-100% chance of making optimal move
  aiStrategy: 'basic' | 'pattern' | 'trap' | 'defensive' | 'psychological';
  behaviorDescription: string;
}

export const GAME_LEVELS: Level[] = [
  {
    level: 1,
    name: "Novice",
    difficulty: 'easy',
    description: "Learn the basics against a beginner AI",
    gridSize: 3,
    aiDepth: 2,
    requiredWins: 1,
    scoreMultiplier: 1.0,
    unlockMessage: "Welcome to Tic-Tac-Dojo! Beat the Novice AI to advance.",
    optimalPlayPercentage: 30,
    aiStrategy: 'basic',
    behaviorDescription: "Makes random moves 70% of the time, optimal moves 30% of the time"
  },
  {
    level: 2,
    name: "Apprentice", 
    difficulty: 'medium',
    description: "Face an AI with pattern recognition",
    gridSize: 3,
    aiDepth: 4,
    requiredWins: 2,
    scoreMultiplier: 1.5,
    unlockMessage: "Well done! The Apprentice level awaits. Win 2 games to advance.",
    optimalPlayPercentage: 50,
    aiStrategy: 'pattern',
    behaviorDescription: "Recognizes basic patterns and plays optimally 50% of the time"
  },
  {
    level: 3,
    name: "Warrior",
    difficulty: 'medium',
    description: "Battle an adaptive AI with improved tactics",
    gridSize: 3,
    aiDepth: 3,
    requiredWins: 2,
    scoreMultiplier: 1.8,
    unlockMessage: "Impressive! Face the adaptive Warrior AI. Win 2 games to prove your skill.",
    optimalPlayPercentage: 55, // Base percentage, will scale up
    aiStrategy: 'pattern',
    behaviorDescription: "Adapts with each defeat - starts with 55% optimal play"
  },
  {
    level: 4,
    name: "Master",
    difficulty: 'medium',
    description: "Challenge an adaptive AI on a larger 4x4 battlefield",
    gridSize: 4, // 4x4 grid for increased complexity
    aiDepth: 4,
    requiredWins: 3,
    scoreMultiplier: 2.2,
    unlockMessage: "Incredible! Face the adaptive Master on a 4x4 grid. Win 3 games as the AI grows stronger.",
    optimalPlayPercentage: 60, // Base percentage, capped at 70%
    aiStrategy: 'pattern',
    behaviorDescription: "Adapts and grows stronger with each defeat - starts with 60% optimal play (max 70%)"
  },
  {
    level: 5,
    name: "Grandmaster",
    difficulty: 'hard',
    description: "Face the ultimate adaptive AI with mercy and cunning",
    gridSize: 4,
    aiDepth: 5,
    requiredWins: 3,
    scoreMultiplier: 3.0,
    unlockMessage: "Final challenge! Defeat the adaptive Grandmaster on a 4x4 grid to complete your journey.",
    optimalPlayPercentage: 70, // Base percentage with mercy system
    aiStrategy: 'defensive',
    behaviorDescription: "Ultimate adaptive AI - grows stronger with each defeat, but shows occasional mercy"
  }
];

// Function to calculate dynamic AI difficulty based on player wins in current level
export function getDynamicAIDifficulty(level: number, currentWins: number): {
  optimalPlayPercentage: number;
  aiDepth: number;
  aiStrategy: string;
} {
  const levelData = GAME_LEVELS[level - 1];
  if (!levelData) {
    return {
      optimalPlayPercentage: 50,
      aiDepth: 3,
      aiStrategy: 'basic'
    };
  }

  // Level 3: Moderate scaling
  if (level === 3) {
    const basePercentage = 55;
    const maxPercentage = 65;
    const baseDepth = 3;
    const maxDepth = 4;
    
    const progressRatio = currentWins / levelData.requiredWins;
    
    return {
      optimalPlayPercentage: Math.round(basePercentage + (maxPercentage - basePercentage) * progressRatio),
      aiDepth: Math.round(baseDepth + (maxDepth - baseDepth) * progressRatio),
      aiStrategy: 'pattern'
    };
  }

  // Level 4: Controlled scaling (capped at 70%)
  if (level === 4) {
    const basePercentage = 60;
    const maxPercentage = 70; // Capped for winability
    const baseDepth = 4;
    const maxDepth = 5;
    
    const progressRatio = currentWins / levelData.requiredWins;
    
    return {
      optimalPlayPercentage: Math.round(basePercentage + (maxPercentage - basePercentage) * progressRatio),
      aiDepth: Math.round(baseDepth + (maxDepth - baseDepth) * progressRatio),
      aiStrategy: currentWins >= 2 ? 'trap' : 'pattern'
    };
  }

  // Level 5: Challenging with mercy system
  if (level === 5) {
    const basePercentage = 70;
    const maxPercentage = 85;
    const baseDepth = 5;
    const maxDepth = 7;
    
    const progressRatio = currentWins / levelData.requiredWins;
    let finalPercentage = Math.round(basePercentage + (maxPercentage - basePercentage) * progressRatio);
    let finalDepth = Math.round(baseDepth + (maxDepth - baseDepth) * progressRatio);
    
    // Mercy system: If player has 0 wins, occasionally reduce difficulty
    if (currentWins === 0) {
      const mercyChance = 0.25; // 25% chance of mercy
      if (Math.random() < mercyChance) {
        finalPercentage = Math.max(60, finalPercentage - 15); // Reduce by 15%
        finalDepth = Math.max(4, finalDepth - 1); // Reduce depth
      }
    }
    
    return {
      optimalPlayPercentage: finalPercentage,
      aiDepth: finalDepth,
      aiStrategy: currentWins >= 2 ? 'trap' : 'defensive'
    };
  }

  // For levels 1-2, return standard difficulty
  return {
    optimalPlayPercentage: levelData.optimalPlayPercentage,
    aiDepth: levelData.aiDepth,
    aiStrategy: levelData.aiStrategy
  };
}

export interface PlayerProgress {
  playerId: string;
  currentLevel: number;
  levelProgress: { [level: number]: { wins: number; losses: number; completed: boolean } };
  totalScore: number;
  gamesPlayed: number;
  achievements: string[];
  completedAt?: string; // When they completed all levels
}

export function getCurrentLevel(playerProgress: PlayerProgress): Level {
  return GAME_LEVELS[playerProgress.currentLevel - 1] || GAME_LEVELS[0];
}

export function getNextLevel(currentLevel: number): Level | null {
  return GAME_LEVELS[currentLevel] || null;
}

export function canAdvanceToNextLevel(playerProgress: PlayerProgress): boolean {
  const currentLevel = getCurrentLevel(playerProgress);
  const levelProgress = playerProgress.levelProgress[currentLevel.level];
  
  if (!levelProgress) return false;
  
  return levelProgress.wins >= currentLevel.requiredWins;
}

export function calculateLevelScore(
  baseScore: number, 
  level: Level, 
  movesCount: number, 
  timeElapsed: number
): number {
  let score = baseScore * level.scoreMultiplier;
  
  // Bonus for efficiency
  const moveBonus = Math.max(0, (15 - movesCount) * 10);
  const timeBonus = Math.max(0, (60000 - timeElapsed) / 1000);
  
  // Grid size bonus
  const gridBonus = level.gridSize > 3 ? 200 : 0;
  
  return Math.floor(score + moveBonus + timeBonus + gridBonus);
}

export function initializePlayerProgress(playerId: string): PlayerProgress {
  return {
    playerId,
    currentLevel: 1,
    levelProgress: {
      1: { wins: 0, losses: 0, completed: false },
      2: { wins: 0, losses: 0, completed: false },
      3: { wins: 0, losses: 0, completed: false },
      4: { wins: 0, losses: 0, completed: false },
      5: { wins: 0, losses: 0, completed: false }
    },
    totalScore: 0,
    gamesPlayed: 0,
    achievements: []
  };
}

export function updatePlayerProgress(
  progress: PlayerProgress,
  level: number,
  won: boolean,
  score: number
): { progress: PlayerProgress; levelUp: boolean; completed: boolean } {
  const newProgress = { ...progress };
  const levelProgress = { ...newProgress.levelProgress[level] };
  
  if (won) {
    levelProgress.wins++;
  } else {
    levelProgress.losses++;
  }
  
  newProgress.levelProgress[level] = levelProgress;
  newProgress.gamesPlayed++;
  newProgress.totalScore += score;
  
  // Check if level is completed
  const currentLevelData = GAME_LEVELS[level - 1];
  const levelCompleted = levelProgress.wins >= currentLevelData.requiredWins && !levelProgress.completed;
  
  let levelUp = false;
  let gameCompleted = false;
  
  if (levelCompleted) {
    levelProgress.completed = true;
    
    // Check if can advance to next level
    if (level < GAME_LEVELS.length) {
      newProgress.currentLevel = level + 1;
      levelUp = true;
    } else {
      // Completed all levels!
      gameCompleted = true;
      newProgress.completedAt = new Date().toISOString();
      newProgress.achievements.push('Grandmaster Champion');
    }
  }
  
  return {
    progress: newProgress,
    levelUp,
    completed: gameCompleted
  };
}