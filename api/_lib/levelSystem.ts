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
    difficulty: 'hard',
    description: "Battle an AI that sets tactical traps",
    gridSize: 3,
    aiDepth: 6,
    requiredWins: 3,
    scoreMultiplier: 2.0,
    unlockMessage: "Impressive! Face the Warrior AI. Win 3 games to prove your skill.",
    optimalPlayPercentage: 70,
    aiStrategy: 'trap',
    behaviorDescription: "Sets up winning traps and plays optimally 70% of the time"
  },
  {
    level: 4,
    name: "Master",
    difficulty: 'impossible',
    description: "Challenge an AI with defensive mastery",
    gridSize: 4, // Increased grid size for more complexity
    aiDepth: 8,
    requiredWins: 2,
    scoreMultiplier: 3.0,
    unlockMessage: "Incredible! The Master level with 4x4 grid. Win 2 games to reach the final stage.",
    optimalPlayPercentage: 85,
    aiStrategy: 'defensive',
    behaviorDescription: "Masters defensive play and blocks all threats with 85% optimal moves"
  },
  {
    level: 5,
    name: "Grandmaster",
    difficulty: 'master' as any,
    description: "Face an AI with psychological warfare tactics",
    gridSize: 4,
    aiDepth: Infinity,
    requiredWins: 1,
    scoreMultiplier: 5.0,
    unlockMessage: "Final challenge! Defeat the Grandmaster to complete your journey.",
    optimalPlayPercentage: 95,
    aiStrategy: 'psychological',
    behaviorDescription: "Uses fake mistakes and mind games while playing optimally 95% of the time"
  }
];

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