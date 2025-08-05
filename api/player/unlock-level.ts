import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase, getPlayerData } from '../_lib/database';
import { validateSchema, sanitizeInput } from '../_lib/validation';
import { authRateLimit, checkRateLimit } from '../_lib/ratelimit';
import { getClientIdentifier } from '../_lib/auth';
import { LevelUnlockManager } from '../_lib/levelUnlock';
import { GAME_LEVELS } from '../_lib/levelSystem';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Rate limiting to prevent code brute forcing
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(authRateLimit, identifier);
    
    if (!rateLimitResult.success) {
      return res.status(429).json({ 
        error: 'Too many unlock attempts',
        retryAfter: rateLimitResult.retryAfter 
      });
    }

    const sanitizedBody = sanitizeInput(req.body);
    
    // Validate request data
    const validation = validateSchema(sanitizedBody, {
      playerId: { type: 'string', required: true, minLength: 1 },
      targetLevel: { type: 'number', required: true, min: 1, max: 5 },
      unlockCode: { type: 'string', required: true, minLength: 1, maxLength: 50 }
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }

    const { playerId, targetLevel, unlockCode } = sanitizedBody;

    // Get player data
    let playerData;
    try {
      playerData = await getPlayerData(playerId);
    } catch (error) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Attempt to unlock the level
    const unlockResult = LevelUnlockManager.unlockLevelWithCode(
      playerData,
      targetLevel,
      unlockCode
    );

    if (!unlockResult.success) {
      // Log failed attempts for security monitoring
      console.warn(`Failed unlock attempt: Player ${playerId}, Level ${targetLevel}, Code: ${unlockCode}`);
      
      return res.status(400).json({ 
        error: unlockResult.message,
        hints: LevelUnlockManager.getHintsForLevel(targetLevel),
        availableMethods: LevelUnlockManager.getAvailableUnlockMethods(targetLevel)
      });
    }

    // Update player's current level in database
    const db = await initializeFirebase();
    const playerRef = db.collection('players').doc(playerId);
    
    await playerRef.update({
      currentLevel: unlockResult.newCurrentLevel,
      lastActive: new Date().toISOString(),
      // Add to achievements if it's an easter egg or challenge
      achievements: playerData.achievements || []
    });

    // Log successful unlock for analytics
    await db.collection('unlockEvents').add({
      playerId,
      targetLevel,
      unlockMethod: 'code',
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    });

    const levelData = GAME_LEVELS[targetLevel - 1];

    res.json({
      success: true,
      message: unlockResult.message,
      unlockedLevel: {
        level: targetLevel,
        name: levelData.name,
        description: levelData.description,
        difficulty: levelData.difficulty,
        gridSize: levelData.gridSize,
        optimalPlayPercentage: levelData.optimalPlayPercentage,
        behaviorDescription: levelData.behaviorDescription
      },
      player: {
        currentLevel: unlockResult.newCurrentLevel,
        totalScore: playerData.totalScore,
        achievements: playerData.achievements || []
      },
      timer: LevelUnlockManager.getTimerConfig(targetLevel)
    });

  } catch (error) {
    console.error('Level unlock error:', error);
    res.status(500).json({ 
      error: 'Failed to unlock level',
      message: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        'Internal server error'
    });
  }
}