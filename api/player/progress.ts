import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase } from '../_lib/database';
import { getClientIdentifier } from '../_lib/auth';
import { GAME_LEVELS, getCurrentLevel, getNextLevel, canAdvanceToNextLevel, initializePlayerProgress } from '../_lib/levelSystem';
import { LevelUnlockManager } from '../_lib/levelUnlock';
import type { PlayerData } from '../_lib/types';

async function handleLevelUnlock(req: VercelRequest, res: VercelResponse) {
  try {
    const { playerId, targetLevel, unlockCode } = req.body;

    if (!playerId || !targetLevel || !unlockCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initializeFirebase();
    const playerDoc = await db.collection('players').doc(playerId).get();
    
    if (!playerDoc.exists) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const playerData = { id: playerDoc.id, ...playerDoc.data() } as PlayerData;

    const unlockResult = LevelUnlockManager.unlockLevelWithCode(
      playerData,
      targetLevel,
      unlockCode
    );

    if (!unlockResult.success) {
      return res.status(400).json({ 
        error: unlockResult.message,
        hints: LevelUnlockManager.getHintsForLevel(targetLevel)
      });
    }

    await db.collection('players').doc(playerId).update({
      currentLevel: unlockResult.newCurrentLevel,
      lastActive: new Date().toISOString()
    });

    const levelData = GAME_LEVELS[targetLevel - 1];

    res.json({
      success: true,
      message: unlockResult.message,
      unlockedLevel: {
        level: targetLevel,
        name: levelData.name,
        description: levelData.description
      },
      timer: LevelUnlockManager.getTimerConfig(targetLevel)
    });

  } catch (error) {
    console.error('Level unlock error:', error);
    res.status(500).json({ error: 'Failed to unlock level' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return handleLevelUnlock(req, res);
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const db = await initializeFirebase();
    const playerRef = db.collection('players').doc(playerId);
    const playerSnap = await playerRef.get();

    let playerData: PlayerData;

    if (!playerSnap.exists) {
      return res.status(404).json({ error: 'Player not found' });
    } else {
      playerData = { id: playerSnap.id, ...playerSnap.data() } as PlayerData;
      
      // Initialize level progress if it doesn't exist (for existing players)
      if (!playerData.currentLevel) {
        const progress = initializePlayerProgress(playerId);
        playerData.currentLevel = progress.currentLevel;
        playerData.levelProgress = progress.levelProgress;
        playerData.totalScore = progress.totalScore || 0;
        playerData.achievements = progress.achievements || [];
        
        await playerRef.update({
          currentLevel: playerData.currentLevel,
          levelProgress: playerData.levelProgress,
          totalScore: playerData.totalScore,
          achievements: playerData.achievements
        });
      }
    }

    const currentLevel = getCurrentLevel({
      playerId: playerData.playerId,
      currentLevel: playerData.currentLevel,
      levelProgress: playerData.levelProgress,
      totalScore: playerData.totalScore,
      gamesPlayed: playerData.gamesPlayed,
      achievements: playerData.achievements || []
    });

    const nextLevel = getNextLevel(playerData.currentLevel);
    const canAdvance = canAdvanceToNextLevel({
      playerId: playerData.playerId,
      currentLevel: playerData.currentLevel,
      levelProgress: playerData.levelProgress,
      totalScore: playerData.totalScore,
      gamesPlayed: playerData.gamesPlayed,
      achievements: playerData.achievements || []
    });

    const currentLevelProgress = playerData.levelProgress[playerData.currentLevel] || { wins: 0, losses: 0, completed: false };

    res.json({
      success: true,
      player: {
        playerId: playerData.playerId,
        playerName: playerData.playerName,
        currentLevel: playerData.currentLevel,
        totalScore: playerData.totalScore,
        achievements: playerData.achievements || [],
        completedAt: playerData.completedAt
      },
      currentLevel: {
        ...currentLevel,
        progress: currentLevelProgress,
        canAdvance
      },
      nextLevel,
      allLevels: GAME_LEVELS.map((level, index) => ({
        ...level,
        isUnlocked: index + 1 <= playerData.currentLevel,
        progress: playerData.levelProgress[level.level] || { wins: 0, losses: 0, completed: false }
      }))
    });

  } catch (error) {
    console.error('Player progress error:', error);
    res.status(500).json({ 
      error: 'Failed to get player progress',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}