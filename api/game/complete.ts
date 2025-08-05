import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase, getPlayerData } from '../_lib/database';
import { validateSchema, sanitizeInput } from '../_lib/validation';
import { updatePlayerProgress, getCurrentLevel, getNextLevel } from '../_lib/levelSystem';
import { AdvancedScoringSystem } from '../_lib/scoring';
import type { PlayerData } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sanitizedBody = sanitizeInput(req.body);
    const { 
      playerId, 
      gameId, 
      won, 
      level, 
      timeElapsed,
      playerMoves = [],
      aiMoves = [],
      finalGrid = [],
      gridSize = 3,
      winner = null
    } = sanitizedBody;

    // Validate required fields
    if (!playerId || !gameId || typeof won !== 'boolean' || !level) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    // Calculate detailed score breakdown
    const scoreBreakdown = AdvancedScoringSystem.calculateGameScore(
      level,
      won,
      gameAnalysis,
      timeElapsed || 60000
    );

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

    // Update database
    const db = await initializeFirebase();
    const playerRef = db.collection('players').doc(playerId);
    
    await playerRef.update({
      currentLevel: progressResult.progress.currentLevel,
      levelProgress: progressResult.progress.levelProgress,
      totalScore: progressResult.progress.totalScore,
      gamesPlayed: progressResult.progress.gamesPlayed,
      achievements: progressResult.progress.achievements,
      wins: won ? (playerData.wins || 0) + 1 : playerData.wins || 0,
      losses: !won ? (playerData.losses || 0) + 1 : playerData.losses || 0,
      lastActive: new Date().toISOString(),
      ...(progressResult.completed ? { completedAt: progressResult.progress.completedAt } : {})
    });

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