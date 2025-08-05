// Core game types
export type Player = 'X' | 'O';
export type GameMode = 'single' | 'multiplayer' | 'ai';
export type GameState = 'notStarted' | 'waiting' | 'active' | 'finished';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible';

// Game board
export interface GameBoard {
  grid: (Player | null)[];
  size: number;
}

// Game data structure
export interface Game {
  id?: string;
  players: string[];
  gameMode: GameMode;
  difficulty?: Difficulty;
  gridSize: number;
  grid: (Player | null)[];
  currentPlayer: Player;
  gameState: GameState;
  winner: Player | 'DRAW' | null;
  moveCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  // Level progression fields
  level?: number;
  levelName?: string;
  requiredWins?: number;
  createdAt?: any; // Firestore timestamp
  lastUpdate?: any; // Firestore timestamp
}

// Player data
export interface PlayerData {
  id?: string;
  playerId: string;
  playerName: string;
  isAnonymous: boolean;
  createdAt: string;
  lastActive: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  // Level progression
  currentLevel: number;
  levelProgress: { [level: number]: { wins: number; losses: number; completed: boolean } };
  totalScore: number;
  achievements: string[];
  completedAt?: string;
}

// Vercel API types
export interface VercelRequest {
  query: { [key: string]: string | string[] | undefined };
  body: any;
  headers: { [key: string]: string | undefined };
  method: string;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (object: any) => VercelResponse;
  setHeader: (key: string, value: string) => VercelResponse;
}

// API Request/Response types
export interface CreateGameRequest {
  playerId: string;
  gameMode: GameMode;
  difficulty?: Difficulty;
  gridSize?: number;
}

export interface CreateGameResponse {
  success: boolean;
  gameId: string;
  gameData: Game;
}

export interface GameMoveRequest {
  gameId: string;
  position: number;
  playerId: string;
  player: Player;
}

export interface GameMoveResponse {
  success: boolean;
  gameState: Game;
  moveResult: {
    position: number;
    player: Player;
    winner: Player | 'DRAW' | null;
    gameOver: boolean;
  };
}

export interface AICalculateRequest {
  gameId: string;
  difficulty?: Difficulty;
}

export interface AICalculateResponse {
  success: boolean;
  move: number;
  difficulty: Difficulty;
  reasoning?: {
    emptySquares: number;
    maxDepth: number;
    gridSize: number;
  };
}

export interface CreateSessionRequest {
  sessionType?: 'anonymous';
  playerName?: string;
}

export interface CreateSessionResponse {
  success: boolean;
  session: {
    playerId: string;
    playerName: string;
    isAnonymous: boolean;
    createdAt: string;
  };
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winRate: string;
  lastActive: string;
}

export interface LeaderboardResponse {
  success: boolean;
  rankings: RankingEntry[];
  metadata: {
    total: number;
    sortBy: string;
    filterLevel?: number | null;
    generatedAt: string;
    availableLevels: {
      level: number;
      name: string;
      description: string;
    }[];
  };
}

export interface RankingEntry {
  rank: number;
  playerId: string;
  playerName: string;
  totalScore: number;
  highestLevel: number;
  levelName: string;
  gamesPlayed: number;
  averageScore: number;
  achievements: string[];
  lastPlayed: string;
  levelProgress: {
    [level: number]: {
      wins: number;
      bestScore: number;
      completed: boolean;
    };
  };
}

// Validation schema types
export interface ValidationRule {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  validate?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Rate limiting types
export interface RateLimitResult {
  success: boolean;
  headers: {
    'X-RateLimit-Limit': string;
    'X-RateLimit-Remaining': string;
    'X-RateLimit-Reset': string;
  };
}

// Auth types
export interface AuthSession {
  playerId: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface TokenVerificationResult {
  success: boolean;
  uid?: string;
  error?: string;
}

// API Error response
export interface APIError {
  error: string;
  message?: string;
  details?: string[];
}

// Environment variables type
export interface Environment {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  NODE_ENV: 'development' | 'production' | 'test';
}