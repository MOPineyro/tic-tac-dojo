import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'Tic-Tac-Dojo API is running!',
    endpoints: {
      auth: '/api/auth/session',
      game: {
        create: '/api/game/create',
        move: '/api/game/move',
        state: '/api/game/state/[id]'
      },
      ai: '/api/ai/calculate-move',
      leaderboard: '/api/leaderboard/rankings'
    }
  });
}