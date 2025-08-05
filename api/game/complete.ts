import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase, getPlayerData, getGameState } from '../_lib/database';
import { validateSchema, sanitizeInput } from '../_lib/validation';
import { updatePlayerProgress, getCurrentLevel, getNextLevel } from '../_lib/levelSystem';
import { AdvancedScoringSystem } from '../_lib/scoring';
import { AntiCheatValidator } from '../_lib/antiCheat';
import { LevelUnlockManager } from '../_lib/levelUnlock';
import type { PlayerData, Player } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sanitizedBody = sanitizeInput(req.body);
    const { 
      playerId, 
      gameId, 
      timeElapsed = 60000
    } = sanitizedBody;

    // Validate required fields
    if (!playerId || !gameId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SECURITY: Get the actual game state from the database to prevent cheating
    let gameState;
    try {
      gameState = await getGameState(gameId);
    } catch (error) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Validate player access to this game
    if (!gameState.players.includes(playerId)) {
      return res.status(403).json({ error: 'Access denied - not your game' });
    }

    // Only allow finalization of finished games
    if (gameState.gameState !== 'finished') {
      return res.status(400).json({ error: 'Game is not finished yet' });
    }

    // Prevent double-processing by checking if game was already finalized
    if (gameState.finalized) {
      return res.status(400).json({ error: 'Game already finalized' });
    }

    // Extract authoritative game data from database
    const level = gameState.level || 1;
    const gridSize = gameState.gridSize || 3;
    const finalGrid = gameState.grid;
    const winner = gameState.winner;
    const moveHistory = gameState.moveHistory || [];

    // ANTI-CHEAT: Validate game integrity
    const cheatCheck = AntiCheatValidator.validateGameIntegrity(finalGrid, moveHistory, gridSize);
    
    if (!cheatCheck.isValid) {
      console.warn(`CHEAT DETECTED for player ${playerId} in game ${gameId}:`, cheatCheck.violations);
      
      // Log the incident but don't block legitimate players
      const db = await initializeFirebase();
      await db.collection('cheatReports').add({
        playerId,
        gameId,
        violations: cheatCheck.violations,
        suspiciousActivity: cheatCheck.suspiciousActivity,
        riskScore: cheatCheck.riskScore,
        timestamp: new Date().toISOString(),
        gameState: {
          grid: finalGrid,
          moveHistory,
          level,
          winner
        }
      });

      // For high-risk violations, reject the game
      if (cheatCheck.riskScore > 70) {
        return res.status(400).json({ 
          error: 'Game validation failed',
          message: 'Irregular game patterns detected. Please play fair!'
        });
      }
    }
    
    // Determine if the human player won based on server-side game state
    const humanPlayer: Player = 'X';
    const won = winner === humanPlayer;
    const isDraw = winner === 'DRAW';

    // Reconstruct move history from game state  
    const playerMoves: number[] = [];
    const aiMoves: number[] = [];
    
    finalGrid.forEach((cell, index) => {
      if (cell === 'X') playerMoves.push(index);
      if (cell === 'O') aiMoves.push(index);
    });

    // Get player data
    let playerData: PlayerData;
    try {
      playerData = await getPlayerData(playerId);
    } catch (error) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get level data
    const levelData = getCurrentLevel({
      playerId: playerData.playerId,
      currentLevel: level,
      levelProgress: playerData.levelProgress,
      totalScore: playerData.totalScore,
      gamesPlayed: playerData.gamesPlayed,
      achievements: playerData.achievements || []
    });

    // Analyze the game performance
    const gameAnalysis = AdvancedScoringSystem.analyzeGame(
      playerMoves,
      aiMoves,
      finalGrid,
      gridSize,
      winner
    );

    // Calculate time bonus if game had timer
    let timeBonus = 0;
    if (gameState.totalTimeLimit && gameState.timeRemaining) {
      timeBonus = LevelUnlockManager.calculateTimeBonus(
        gameState.timeRemaining,
        gameState.totalTimeLimit
      );
    }

    // Calculate detailed score breakdown
    const scoreBreakdown = AdvancedScoringSystem.calculateGameScore(
      level,
      won,
      gameAnalysis,
      timeElapsed || 60000
    );
    
    // Add time bonus to score breakdown
    scoreBreakdown.timeBonus += timeBonus;
    scoreBreakdown.totalScore += timeBonus;

    // Update player progress
    const progressResult = updatePlayerProgress(
      {
        playerId: playerData.playerId,
        currentLevel: playerData.currentLevel,
        levelProgress: playerData.levelProgress,
        totalScore: playerData.totalScore,
        gamesPlayed: playerData.gamesPlayed,
        achievements: playerData.achievements || []
      },
      level,
      won,
      scoreBreakdown.totalScore
    );

    // Update database with atomic transaction
    const db = await initializeFirebase();
    const batch = db.batch();
    
    // Update player data
    const playerRef = db.collection('players').doc(playerId);
    batch.update(playerRef, {
      currentLevel: progressResult.progress.currentLevel,
      levelProgress: progressResult.progress.levelProgress,
      totalScore: progressResult.progress.totalScore,
      gamesPlayed: progressResult.progress.gamesPlayed,
      achievements: progressResult.progress.achievements,
      wins: won ? (playerData.wins || 0) + 1 : playerData.wins || 0,
      losses: (!won && !isDraw) ? (playerData.losses || 0) + 1 : playerData.losses || 0,
      draws: isDraw ? (playerData.draws || 0) + 1 : playerData.draws || 0,
      lastActive: new Date().toISOString(),
      ...(progressResult.completed ? { completedAt: progressResult.progress.completedAt } : {})
    });

    // Mark game as finalized to prevent double-processing
    const gameRef = db.collection('games').doc(gameId);
    batch.update(gameRef, {
      finalized: true,
      finalizedAt: new Date().toISOString(),
      finalScore: scoreBreakdown.totalScore
    });

    // Store score record for leaderboard
    const scoreRef = db.collection('scores').doc();
    batch.set(scoreRef, {
      playerId,
      gameId,
      level,
      won,
      isDraw,
      scoreBreakdown,
      gameAnalysis,
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    });

    // Commit all updates atomically
    await batch.commit();

    // Prepare response
    const response: any = {
      success: true,
      result: {
        won,
        score: scoreBreakdown.totalScore,
        scoreBreakdown,
        gameAnalysis,
        levelCompleted: progressResult.progress.levelProgress[level].completed,
        levelUp: progressResult.levelUp,
        gameCompleted: progressResult.completed
      },
      currentLevel: {
        level: progressResult.progress.currentLevel,
        name: levelData.name,
        progress: progressResult.progress.levelProgress[progressResult.progress.currentLevel]
      },
      player: {
        totalScore: progressResult.progress.totalScore,
        achievements: progressResult.progress.achievements
      }
    };

    // Add next level info if leveled up
    if (progressResult.levelUp) {
      const nextLevel = getNextLevel(level);
      if (nextLevel) {
        response.nextLevel = {
          level: nextLevel.level,
          name: nextLevel.name,
          description: nextLevel.description,
          unlockMessage: nextLevel.unlockMessage,
          requiredWins: nextLevel.requiredWins,
          gridSize: nextLevel.gridSize
        };
      }
    }

    // Add completion message if game completed
    if (progressResult.completed) {
      response.completionMessage = "Congratulations! You have mastered all levels of Tic-Tac-Dojo!";
    }

    res.json(response);

  } catch (error) {
    console.error('Game completion error:', error);
    res.status(500).json({ 
      error: 'Failed to complete game',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}