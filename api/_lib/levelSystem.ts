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
    unlockMessage: "Welcome to Tic-Tac-Dojo! Beat the Novice AI to advance."
  },
  {
    level: 2,
    name: "Apprentice", 
    difficulty: 'medium',
    description: "Face a more strategic opponent",
    gridSize: 3,
    aiDepth: 4,
    requiredWins: 2,
    scoreMultiplier: 1.5,
    unlockMessage: "Well done! The Apprentice level awaits. Win 2 games to advance."
  },
  {
    level: 3,
    name: "Warrior",
    difficulty: 'hard',
    description: "Battle an advanced AI with tactical thinking",
    gridSize: 3,
    aiDepth: 6,
    requiredWins: 3,
    scoreMultiplier: 2.0,
    unlockMessage: "Impressive! Face the Warrior AI. Win 3 games to prove your skill."
  },
  {
    level: 4,
    name: "Master",
    difficulty: 'impossible',
    description: "Challenge a near-perfect AI opponent",
    gridSize: 4, // Increased grid size for more complexity
    aiDepth: 8,
    requiredWins: 2,
    scoreMultiplier: 3.0,
    unlockMessage: "Incredible! The Master level with 4x4 grid. Win 2 games to reach the final stage."
  },
  {
    level: 5,
    name: "Grandmaster",
    difficulty: 'master' as any,
    description: "Face the ultimate AI challenge with perfect play",
    gridSize: 4,
    aiDepth: Infinity,
    requiredWins: 1,
    scoreMultiplier: 5.0,
    unlockMessage: "Final challenge! Defeat the Grandmaster to complete your journey."
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