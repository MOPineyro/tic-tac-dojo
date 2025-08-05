import admin from 'firebase-admin';
import type { Game, PlayerData } from './types';

// Reuse connection to minimize overhead (Fluid Compute optimization)
let cachedConnection: admin.firestore.Firestore | null = null;

export async function initializeFirebase(): Promise<admin.firestore.Firestore> {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID!,
      });
    }

    cachedConnection = admin.firestore();
    return cachedConnection;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw new Error('Failed to initialize Firebase');
  }
}

export async function getGameState(gameId: string): Promise<Game> {
  const db = await initializeFirebase();
  const gameRef = db.collection('games').doc(gameId);
  const gameSnap = await gameRef.get();
  
  if (!gameSnap.exists) {
    throw new Error('Game not found');
  }
  
  return { id: gameSnap.id, ...gameSnap.data() } as Game;
}

export async function getPlayerData(playerId: string): Promise<PlayerData> {
  const db = await initializeFirebase();
  const playerRef = db.collection('players').doc(playerId);
  const playerSnap = await playerRef.get();
  
  if (!playerSnap.exists) {
    throw new Error('Player not found');
  }
  
  return { id: playerSnap.id, ...playerSnap.data() } as PlayerData;
}

export async function updateGameState(gameId: string, gameData: Partial<Game>): Promise<boolean> {
  const db = await initializeFirebase();
  const gameRef = db.collection('games').doc(gameId);
  
  await gameRef.update({
    ...gameData,
    lastUpdate: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return true;
}

export async function createGame(gameData: Omit<Game, 'id' | 'createdAt' | 'lastUpdate'>): Promise<string> {
  const db = await initializeFirebase();
  const gameRef = await db.collection('games').add({
    ...gameData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdate: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return gameRef.id;
}