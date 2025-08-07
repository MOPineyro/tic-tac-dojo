import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase, getPlayerData, getGameState } from '../_lib/database';
import { validateSchema, sanitizeInput, schemas } from '../_lib/validation';
import { updatePlayerProgress, getCurrentLevel, getNextLevel } from '../_lib/levelSystem';
import { AdvancedScoringSystem, ScoreBreakdown } from '../_lib/scoring';
import { AntiCheatValidator } from '../_lib/antiCheat';
import { LevelUnlockManager } from '../_lib/levelUnlock';
import type { PlayerData, Player, Game } from '../_lib/types';

/** Helper function to detect if game ended due to timeout */
function checkTimeoutLoss(gameState: Game): boolean {
  if (gameState.totalTimeLimit && gameState.timeRemaining !== undefined) {
    if (gameState.timeRemaining <= 0) {
      return true;
    }
  }
  
  if (gameState.moveTimeLimit && gameState.lastMoveTime) {
    const timeSinceLastMove = Date.now() - new Date(gameState.lastMoveTime).getTime();
    const timeSinceLastMoveSeconds = Math.floor(timeSinceLastMove / 1000);
    
    if (timeSinceLastMoveSeconds > gameState.moveTimeLimit) {
      return true;
    }
  }
  
  if (gameState.timeoutLoss) {
    return true;
  }
  
  // Special case: If game has no moves but has winner='O', likely a frontend timeout
  const hasNoMoves = gameState.moveCount === 0 || (gameState.moveHistory && gameState.moveHistory.length === 0);
  if (hasNoMoves && gameState.winner === 'O' && gameState.gameState === 'finished') {
    return true;
  }
  
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sanitizedBody = sanitizeInput(req.body);
    console.log(`Game completion request body:`, sanitizedBody);
    
    // Validate schema
    const validation = validateSchema(sanitizedBody, schemas.gameCompletion);
    if (!validation.valid) {
      console.log('Validation failed:', validation.errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }
    
    const { 
      playerId, 
      gameId, 
      timeElapsed = 60000
    } = sanitizedBody;

    console.log(`Game completion request: gameId=${gameId}, playerId=${playerId}`);

    if (!playerId || !gameId) {
      console.log('Missing required fields:', { playerId, gameId });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SECURITY: Get the actual game state from the database to prevent cheating
    let gameState;
    try {
      gameState = await getGameState(gameId);
      console.log(`Database game state: gameState=${gameState.gameState}, winner=${gameState.winner}, moveCount=${gameState.moveCount}, finalized=${gameState.finalized}`);
      console.log(`Database grid:`, gameState.grid);
    } catch (error) {
      console.log(`Game not found: ${gameId}`, error);
      return res.status(404).json({ error: 'Game not found' });
    }

    if (!gameState.players.includes(playerId)) {
      console.log(`Access denied: player ${playerId} not in game ${gameId} players:`, gameState.players);
      return res.status(403).json({ error: 'Access denied - not your game' });
    }

    if (gameState.gameState !== 'finished') {
      console.log(`Game not finished: gameState=${gameState.gameState}, will attempt to finish it`);
    }

    if (gameState.finalized) {
      console.log(`Game already finalized: ${gameId}`);
      return res.status(400).json({ error: 'Game already finalized' });
    }

    const level = gameState.level || 1;
    const gridSize = gameState.gridSize || 3;
    const finalGrid = gameState.grid;
    const winner = gameState.winner;
    const moveHistory = gameState.moveHistory || [];

    const isTimeoutLoss = checkTimeoutLoss(gameState);
    console.log(`Timeout check for game ${gameId}: isTimeout=${isTimeoutLoss}, winner=${winner}, gameState=${gameState.gameState}`);
    
    if (isTimeoutLoss) {
      console.log(`Processing timeout loss for game ${gameId}`);
      const db = await initializeFirebase();
      const gameRef = db.collection('games').doc(gameId);
      
      const updateData: any = {
        gameState: 'finished',
        finishedAt: new Date().toISOString(),
        timeoutLoss: true
      };
      
      if (!winner) {
        updateData.winner = 'O'; // AI wins on timeout
        gameState.winner = 'O';
      }
      
      await gameRef.update(updateData);
      
      gameState.gameState = 'finished';
      gameState.timeoutLoss = true;
      if (!gameState.finishedAt) {
        gameState.finishedAt = new Date().toISOString();
      }
    }
    
    if (gameState.gameState !== 'finished') {
      console.log(`Game ${gameId} is still not finished after timeout check: ${gameState.gameState}`);
      return res.status(400).json({ error: 'Game is not finished yet' });
    }

    // ANTI-CHEAT: Validate game integrity (skip for timeout losses with no moves)
    const isTimeoutWithNoMoves = (gameState.timeoutLoss || isTimeoutLoss) && moveHistory.length === 0;
    
    if (!isTimeoutWithNoMoves) {
      const cheatCheck = AntiCheatValidator.validateGameIntegrity(finalGrid, moveHistory, gridSize);
      
      if (!cheatCheck.isValid) {
        console.warn(`CHEAT DETECTED for player ${playerId} in game ${gameId}:`, cheatCheck.violations);
        
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

        if (cheatCheck.riskScore > 70) {
          return res.status(400).json({ 
            error: 'Game validation failed',
            message: 'Irregular game patterns detected. Please play fair!'
          });
        }
      }
    } else {
      console.log(`Skipping anti-cheat validation for timeout loss with no moves: game ${gameId}`);
    }
    
    const humanPlayer: Player = 'X';
    const finalWinner = gameState.winner; // Use updated winner from timeout processing
    const won = finalWinner === humanPlayer;
    const isDraw = finalWinner === 'DRAW';
    const wasTimeoutLoss = gameState.timeoutLoss || isTimeoutLoss;
    
    console.log(`Winner determination: originalWinner=${winner}, finalWinner=${finalWinner}, won=${won}, isDraw=${isDraw}, wasTimeoutLoss=${wasTimeoutLoss}`);

    const playerMoves: number[] = [];
    const aiMoves: number[] = [];
    
    finalGrid.forEach((cell, index) => {
      if (cell === 'X') playerMoves.push(index);
      if (cell === 'O') aiMoves.push(index);
    });

    let playerData: PlayerData;
    try {
      playerData = await getPlayerData(playerId);
      console.log(`Player data loaded: ${playerId}, currentLevel=${playerData.currentLevel}`);
    } catch (error) {
      console.log(`Player not found: ${playerId}`, error);
      return res.status(404).json({ error: 'Player not found' });
    }

    const levelData = getCurrentLevel({
      playerId: playerData.playerId,
      currentLevel: level,
      levelProgress: playerData.levelProgress,
      totalScore: playerData.totalScore,
      gamesPlayed: playerData.gamesPlayed,
      achievements: playerData.achievements || []
    });

    const gameAnalysis = AdvancedScoringSystem.analyzeGame(
      playerMoves,
      aiMoves,
      finalGrid,
      gridSize,
      finalWinner
    );

    let timeBonus = 0;
    if (gameState.totalTimeLimit && gameState.timeRemaining) {
      timeBonus = LevelUnlockManager.calculateTimeBonus(
        gameState.timeRemaining,
        gameState.totalTimeLimit
      );
    }

    const scoreBreakdown = AdvancedScoringSystem.calculateGameScore(
      level,
      won,
      gameAnalysis,
      timeElapsed || 60000
    );
    
    if (wasTimeoutLoss && !won) {
      const timeoutPenalty = Math.floor(scoreBreakdown.totalScore * 0.5); // 50% penalty
      scoreBreakdown.timeoutPenalty = timeoutPenalty;
      scoreBreakdown.totalScore = Math.max(0, scoreBreakdown.totalScore - timeoutPenalty);
    }
    
    if (!wasTimeoutLoss) {
      scoreBreakdown.timeBonus += timeBonus;
      scoreBreakdown.totalScore += timeBonus;
    }

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

    const db = await initializeFirebase();
    const batch = db.batch();
    
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
      timeoutLosses: wasTimeoutLoss ? (playerData.timeoutLosses || 0) + 1 : playerData.timeoutLosses || 0,
      lastActive: new Date().toISOString(),
      ...(progressResult.completed ? { completedAt: progressResult.progress.completedAt } : {})
    });

    const gameRef = db.collection('games').doc(gameId);
    batch.update(gameRef, {
      finalized: true,
      finalizedAt: new Date().toISOString(),
      finalScore: scoreBreakdown.totalScore
    });

    const scoreRef = db.collection('scores').doc();
    batch.set(scoreRef, {
      playerId,
      gameId,
      level,
      won,
      isDraw,
      winner: finalWinner,
      isTimeoutLoss: wasTimeoutLoss,
      scoreBreakdown,
      gameAnalysis,
      timestamp: new Date().toISOString(),
      createdAt: new Date()
    });

    await batch.commit();

    const response: any = {
      success: true,
      result: {
        won,
        winner: finalWinner,
        score: scoreBreakdown.totalScore,
        scoreBreakdown,
        gameAnalysis,
        isTimeoutLoss: wasTimeoutLoss,
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

    if (progressResult.completed) {
      response.completionMessage = "Congratulations! You have mastered all levels of Tic-Tac-Dojo!";
    }

    console.log(`Game completion successful for ${gameId}: score=${response.result.score}, won=${response.result.won}`);
    res.json(response);

  } catch (error) {
    console.error('Game completion error:', error);
    res.status(500).json({ 
      error: 'Failed to complete game',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}