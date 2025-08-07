import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase } from './_lib/database';
import { getClientIdentifier } from './_lib/auth';
import { sanitizeInput } from './_lib/validation';
import { GAME_LEVELS } from './_lib/levelSystem';

// Admin authentication middleware
function verifyAdminAccess(req: VercelRequest): boolean {
  const adminKey = req.headers['x-admin-key'];
  return adminKey === process.env.ADMIN_KEY;
}

// Get system statistics
async function getSystemStats(req: VercelRequest, res: VercelResponse) {
  try {
    const db = await initializeFirebase();
    
    // Get player statistics
    const playersSnapshot = await db.collection('players').get();
    const players = playersSnapshot.docs.map(doc => doc.data());
    
    // Get game statistics
    const gamesSnapshot = await db.collection('games').get();
    const games = gamesSnapshot.docs.map(doc => doc.data());
    
    // Calculate player stats
    const totalPlayers = players.length;
    const activePlayers = players.filter(p => {
      const lastPlayed = new Date(p.lastPlayed || p.lastActive || 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return lastPlayed > weekAgo;
    }).length;
    
    const playersByLevel = players.reduce((acc, player) => {
      const level = player.currentLevel || 1;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const totalScore = players.reduce((sum, player) => sum + (player.totalScore || 0), 0);
    const averageScore = totalPlayers > 0 ? Math.round(totalScore / totalPlayers) : 0;
    
    // Calculate game stats
    const totalGames = games.length;
    const completedGames = games.filter(g => g.gameState === 'finished').length;
    const activeGames = games.filter(g => g.gameState === 'active').length;
    
    const gamesByLevel = games.reduce((acc, game) => {
      const level = game.level || 1;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentGames = games.filter(g => {
      const createdAt = new Date(g.createdAt?.toDate?.() || g.createdAt || 0);
      return createdAt > yesterday;
    }).length;
    
    const recentPlayers = players.filter(p => {
      const createdAt = new Date(p.createdAt?.toDate?.() || p.createdAt || 0);
      return createdAt > yesterday;
    }).length;
    
    // Calculate win rates by level
    const winRatesByLevel = Object.keys(gamesByLevel).reduce((acc, level) => {
      const levelGames = games.filter(g => g.level == level && g.gameState === 'finished');
      const playerWins = levelGames.filter(g => g.winner === 'X').length;
      const totalFinished = levelGames.length;
      acc[level] = totalFinished > 0 ? Math.round((playerWins / totalFinished) * 100) : 0;
      return acc;
    }, {} as Record<string, number>);
    
    res.json({
      success: true,
      stats: {
        players: {
          total: totalPlayers,
          active: activePlayers,
          byLevel: playersByLevel,
          averageScore,
          totalScore,
          newToday: recentPlayers
        },
        games: {
          total: totalGames,
          completed: completedGames,
          active: activeGames,
          byLevel: gamesByLevel,
          newToday: recentGames,
          winRatesByLevel
        },
        system: {
          lastUpdated: new Date().toISOString(),
          uptimeHours: Math.round(process.uptime() / 3600 * 100) / 100
        }
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve system statistics' });
  }
}

// Get admin action logs
async function getAdminLogs(req: VercelRequest, res: VercelResponse) {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const db = await initializeFirebase();
    
    const logsSnapshot = await db.collection('admin_actions')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit.toString()))
      .offset(parseInt(offset.toString()))
      .get();
    
    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const totalSnapshot = await db.collection('admin_actions').get();
    
    res.json({
      success: true,
      logs,
      total: totalSnapshot.size,
      page: Math.floor(parseInt(offset.toString()) / parseInt(limit.toString())) + 1,
      totalPages: Math.ceil(totalSnapshot.size / parseInt(limit.toString()))
    });
    
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin logs' });
  }
}

// Get all users
async function getAllUsers(req: VercelRequest, res: VercelResponse) {
  try {
    const { limit = 20, offset = 0, search = '', sortBy = 'totalScore', sortOrder = 'desc' } = req.query;
    const db = await initializeFirebase();
    
    let query = db.collection('players');
    
    // Apply search filter if provided
    if (search) {
      const allPlayers = await query.get();
      const filteredPlayers = allPlayers.docs.filter(doc => {
        const data = doc.data();
        return data.playerName?.toLowerCase().includes(search.toString().toLowerCase()) ||
               data.playerId?.toLowerCase().includes(search.toString().toLowerCase());
      });
      
      // Sort manually
      const sortedPlayers = filteredPlayers.sort((a, b) => {
        const aData = a.data();
        const bData = b.data();
        const aValue = aData[sortBy as string] || 0;
        const bValue = bData[sortBy as string] || 0;
        
        if (sortOrder === 'desc') {
          return bValue - aValue;
        }
        return aValue - bValue;
      });
      
      // Apply pagination
      const startIndex = parseInt(offset.toString());
      const endIndex = startIndex + parseInt(limit.toString());
      const paginatedPlayers = sortedPlayers.slice(startIndex, endIndex);
      
      const users = paginatedPlayers.map(doc => ({
        id: doc.id,
        ...doc.data(),
        levelName: GAME_LEVELS[doc.data().currentLevel - 1]?.name || 'Unknown'
      }));
      
      return res.json({
        success: true,
        users,
        total: filteredPlayers.length,
        page: Math.floor(startIndex / parseInt(limit.toString())) + 1,
        totalPages: Math.ceil(filteredPlayers.length / parseInt(limit.toString()))
      });
    }
    
    // No search - use Firebase ordering
    if (sortBy === 'totalScore' || sortBy === 'currentLevel' || sortBy === 'gamesPlayed') {
      query = query.orderBy(sortBy.toString(), sortOrder as 'asc' | 'desc');
    }
    
    const snapshot = await query.limit(parseInt(limit.toString())).offset(parseInt(offset.toString())).get();
    const totalSnapshot = await db.collection('players').get();
    
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      levelName: GAME_LEVELS[doc.data().currentLevel - 1]?.name || 'Unknown'
    }));
    
    res.json({
      success: true,
      users,
      total: totalSnapshot.size,
      page: Math.floor(parseInt(offset.toString()) / parseInt(limit.toString())) + 1,
      totalPages: Math.ceil(totalSnapshot.size / parseInt(limit.toString()))
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
}

// Get specific user
async function getUserDetails(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    console.log('Getting user details for:', userId);
    const db = await initializeFirebase();
    const userDoc = await db.collection('players').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    res.json({
      success: true,
      user: {
        id: userDoc.id,
        ...userData,
        levelName: GAME_LEVELS[userData?.currentLevel - 1]?.name || 'Unknown'
      },
      recentGames: [] // Skip games for now to avoid query issues
    });
    
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to retrieve user details' });
  }
}

// Update user
async function updateUser(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const sanitizedBody = sanitizeInput(req.body);
    const { playerName, totalScore, currentLevel } = sanitizedBody;
    
    const db = await initializeFirebase();
    const userRef = db.collection('players').doc(userId);
    
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const updateData: any = { lastActive: new Date().toISOString() };
    
    if (playerName !== undefined) updateData.playerName = playerName;
    if (totalScore !== undefined) updateData.totalScore = parseInt(totalScore);
    
    // Handle level changes with proper unlocking
    if (currentLevel !== undefined) {
      const newLevel = parseInt(currentLevel);
      if (newLevel >= 1 && newLevel <= 5) {
        const oldLevel = userData?.currentLevel || 1;
        updateData.currentLevel = newLevel;
        
        // If setting to a higher level, unlock all levels up to that point
        if (newLevel > oldLevel) {
          const existingProgress = userData?.levelProgress || {};
          const updatedProgress = { ...existingProgress };
          
          // Ensure all levels up to the new level are unlocked
          for (let level = 1; level <= newLevel; level++) {
            if (!updatedProgress[level]) {
              const levelInfo = GAME_LEVELS[level - 1];
              updatedProgress[level] = {
                wins: 0,
                losses: 0,
                draws: 0,
                requiredWins: levelInfo?.requiredWins || 3,
                completed: level < newLevel, // Mark lower levels as completed
                unlockedBy: 'admin',
                unlockedAt: new Date().toISOString()
              };
            } else {
              // Mark lower levels as completed if not already
              if (level < newLevel) {
                updatedProgress[level].completed = true;
              }
            }
          }
          
          updateData.levelProgress = updatedProgress;
          
          console.log(`Admin unlocked levels 1-${newLevel} for user ${userId}`);
        }
      }
    }
    
    await userRef.update(updateData);
    
    // Log admin action for level changes
    if (currentLevel !== undefined) {
      try {
        await db.collection('admin_actions').add({
          type: 'level_change',
          userId,
          adminKey: req.headers['x-admin-key'],
          oldLevel: userData?.currentLevel || 1,
          newLevel: parseInt(currentLevel),
          timestamp: new Date().toISOString(),
          ip: getClientIdentifier(req)
        });
      } catch (logError) {
        console.warn('Failed to log level change action:', logError);
      }
    }
    
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    
    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedDoc.id,
        ...updatedData,
        levelName: GAME_LEVELS[updatedData?.currentLevel - 1]?.name || 'Unknown'
      }
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

// Delete user
async function deleteUser(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const db = await initializeFirebase();
    
    const userDoc = await db.collection('players').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Try to delete user's games
    try {
      const gamesSnapshot = await db.collection('games')
        .where('players', 'array-contains', userId)
        .get();
      
      if (!gamesSnapshot.empty) {
        const batch = db.batch();
        gamesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        batch.delete(userDoc.ref);
        await batch.commit();
      } else {
        await userDoc.ref.delete();
      }
    } catch (gamesError) {
      console.warn('Error deleting games, proceeding with user deletion:', gamesError);
      await userDoc.ref.delete();
    }
    
    // Log admin action
    try {
      await db.collection('admin_actions').add({
        type: 'user_deletion',
        userId,
        adminKey: req.headers['x-admin-key'],
        timestamp: new Date().toISOString(),
        ip: getClientIdentifier(req)
      });
    } catch (logError) {
      console.warn('Failed to log admin action:', logError);
    }
    
    res.json({
      success: true,
      message: 'User and associated data deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// Adjust user points
async function adjustUserPoints(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const sanitizedBody = sanitizeInput(req.body);
    const { points, reason } = sanitizedBody;
    
    if (!points || !reason) {
      return res.status(400).json({ error: 'Points and reason are required' });
    }
    
    const db = await initializeFirebase();
    const userRef = db.collection('players').doc(userId);
    
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    const newTotalScore = (userData?.totalScore || 0) + parseInt(points);
    
    await userRef.update({
      totalScore: Math.max(0, newTotalScore),
      lastActive: new Date().toISOString()
    });
    
    // Log the adjustment
    await db.collection('admin_actions').add({
      type: 'points_adjustment',
      userId,
      adminKey: req.headers['x-admin-key'],
      pointsAdjusted: parseInt(points),
      reason,
      oldScore: userData?.totalScore || 0,
      newScore: Math.max(0, newTotalScore),
      timestamp: new Date().toISOString(),
      ip: getClientIdentifier(req)
    });
    
    res.json({
      success: true,
      message: `Points adjusted by ${points}`,
      oldScore: userData?.totalScore || 0,
      newScore: Math.max(0, newTotalScore)
    });
    
  } catch (error) {
    console.error('Adjust points error:', error);
    res.status(500).json({ error: 'Failed to adjust points' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Check admin access
  if (!verifyAdminAccess(req)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { method } = req;
  const { action, userId } = req.query;
  
  try {
    // Route based on action parameter
    switch (action) {
      case 'stats':
        if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await getSystemStats(req, res);
        
      case 'logs':
        if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await getAdminLogs(req, res);
        
      case 'users':
        if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        return await getAllUsers(req, res);
        
      case 'user':
        if (!userId || typeof userId !== 'string') {
          return res.status(400).json({ error: 'User ID is required' });
        }
        
        switch (method) {
          case 'GET':
            return await getUserDetails(req, res, userId);
          case 'PUT':
            return await updateUser(req, res, userId);
          case 'DELETE':
            return await deleteUser(req, res, userId);
          default:
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
      case 'adjust-points':
        if (method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        if (!userId || typeof userId !== 'string') {
          return res.status(400).json({ error: 'User ID is required' });
        }
        return await adjustUserPoints(req, res, userId);
        
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
    
  } catch (error) {
    console.error('Admin handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
