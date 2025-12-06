import { Router } from 'express';
import { prisma } from '@meshscout/database';

export const leaderboardRouter = Router();

/**
 * GET /api/leaderboard
 * Get player leaderboard
 */
leaderboardRouter.get('/', async (req, res) => {
  try {
    const { limit = '50' } = req.query;

    const players = await prisma.player.findMany({
      take: parseInt(limit as string),
      orderBy: { totalPoints: 'desc' },
      select: {
        id: true,
        username: true,
        nodeId: true,
        totalPoints: true,
        totalTraceroutes: true,
        longestRoute: true,
        createdAt: true,
      },
    });

    res.json({ players });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/leaderboard/:id
 * Get specific player stats
 */
leaderboardRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        traceroutes: {
          take: 10,
          orderBy: { startTime: 'desc' },
        },
        scores: {
          take: 20,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Calculate rank
    const rank = await prisma.player.count({
      where: {
        totalPoints: {
          gt: player.totalPoints,
        },
      },
    }) + 1;

    res.json({
      ...player,
      rank,
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});
