import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeFirebase } from '../_lib/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simple admin authentication (in production, use proper auth)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = 20, riskThreshold = 30 } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const riskNum = parseInt(riskThreshold as string) || 30;

    const db = await initializeFirebase();
    
    // Get cheat reports sorted by risk score and timestamp
    const reportsSnapshot = await db.collection('cheatReports')
      .where('riskScore', '>=', riskNum)
      .orderBy('riskScore', 'desc')
      .orderBy('timestamp', 'desc')
      .limit(limitNum)
      .get();

    const reports = reportsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Don't expose full game state in summary
      gameState: undefined
    }));

    // Get summary statistics
    const totalReportsSnapshot = await db.collection('cheatReports').get();
    const highRiskReports = totalReportsSnapshot.docs.filter(doc => 
      (doc.data().riskScore || 0) >= 70
    ).length;

    res.json({
      success: true,
      reports,
      summary: {
        totalReports: totalReportsSnapshot.size,
        highRiskReports,
        reportsPeriod: 'All time',
        threshold: riskNum
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin cheat reports error:', error);
    res.status(500).json({ 
      error: 'Failed to get cheat reports',
      message: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : 
        'Internal server error'
    });
  }
}