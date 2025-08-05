import { initializeFirebase } from './database.js';
import type { AuthSession, TokenVerificationResult } from './types.js';
import type { NextApiRequest } from 'next';

// Verify player access to a game
export async function verifyPlayerAccess(gameId: string, playerId: string): Promise<boolean> {
  try {
    const db = await initializeFirebase();
    const gameRef = db.collection('games').doc(gameId);
    const gameSnap = await gameRef.get();
    
    if (!gameSnap.exists) {
      return false;
    }
    
    const gameData = gameSnap.data();
    
    // Check if player is part of this game
    return gameData?.players && gameData.players.includes(playerId);
  } catch (error) {
    console.error('Auth verification error:', error);
    return false;
  }
}

// Verify Firebase ID token (for authenticated endpoints)
export async function verifyIdToken(idToken: string): Promise<TokenVerificationResult> {
  try {
    const admin = await import('firebase-admin');
    const decodedToken = await admin.default.auth().verifyIdToken(idToken);
    return { success: true, uid: decodedToken.uid };
  } catch (error) {
    console.error('ID token verification error:', error);
    return { success: false, error: 'Invalid token' };
  }
}

// Extract player ID from request (from token or body)
export function getPlayerIdFromRequest(req: any): string | null {
  // Try to get from authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // This would need to be decoded from JWT in a real implementation
    // For now, we'll use the playerId from the request body
  }
  
  // Fallback to request body
  return req.body?.playerId || null;
}

// Get IP address for rate limiting
export function getClientIdentifier(req: any): string {
  return req.headers['x-forwarded-for'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

// Create a simple session for anonymous players
export function createAnonymousSession(): AuthSession {
  return {
    playerId: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isAnonymous: true,
    createdAt: new Date().toISOString()
  };
}