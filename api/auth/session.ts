import { authRateLimit, checkRateLimit } from '../_lib/ratelimit';
import { initializeFirebase } from '../_lib/database';
import { createAnonymousSession, getClientIdentifier } from '../_lib/auth';
import { sanitizeInput } from '../_lib/validation';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { CreateSessionRequest, CreateSessionResponse, APIError } from '../_lib/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client identifier for rate limiting
    const identifier = getClientIdentifier(req);
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(authRateLimit, identifier);
    
    // Set rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'Too many authentication requests' });
    }

    const sanitizedBody = sanitizeInput(req.body);
    const { sessionType = 'anonymous', playerName } = sanitizedBody;

    if (sessionType === 'anonymous') {
      // Create anonymous session
      const session = createAnonymousSession();
      
      // Store basic player info in Firebase
      const db = await initializeFirebase();
      await db.collection('players').doc(session.playerId).set({
        playerId: session.playerId,
        playerName: playerName || `Anonymous Player`,
        isAnonymous: true,
        createdAt: session.createdAt,
        lastActive: session.createdAt,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0
      });

      res.json({
        success: true,
        session: {
          playerId: session.playerId,
          playerName: playerName || `Anonymous Player`,
          isAnonymous: true,
          createdAt: session.createdAt
        }
      });
    } else {
      // For future: handle Firebase Authentication
      res.status(400).json({ 
        error: 'Unsupported session type'
      });
    }

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create session',
      message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
    });
  }
}