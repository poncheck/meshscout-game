import { Router } from 'express';
import { prisma } from '@meshscout/database';

export const statsRouter = Router();

/**
 * GET /api/stats
 * Get overall system statistics
 */
statsRouter.get('/', async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [
      totalNodes,
      activeNodes24h,
      totalPackets,
      packets24h,
      packets1h,
      traceroutes,
      totalPlayers,
    ] = await Promise.all([
      prisma.node.count(),
      prisma.node.count({
        where: {
          lastSeen: { gte: oneDayAgo },
        },
      }),
      prisma.packet.count(),
      prisma.packet.count({
        where: {
          rxTime: { gte: oneDayAgo },
        },
      }),
      prisma.packet.count({
        where: {
          rxTime: { gte: oneHourAgo },
        },
      }),
      prisma.traceroute.count(),
      prisma.player.count(),
    ]);

    // Calculate packets per second (last hour)
    const packetsPerSecond = packets1h / 3600;

    res.json({
      nodes: {
        total: totalNodes,
        active24h: activeNodes24h,
      },
      packets: {
        total: totalPackets,
        last24h: packets24h,
        last1h: packets1h,
        perSecond: parseFloat(packetsPerSecond.toFixed(2)),
      },
      traceroutes: {
        total: traceroutes,
      },
      players: {
        total: totalPlayers,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/stats/activity
 * Get activity over time
 */
statsRouter.get('/activity', async (req, res) => {
  try {
    const { hours = '24' } = req.query;
    const hoursAgo = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);

    // Get packet count grouped by hour
    const activity = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('hour', "rxTime") as hour,
        COUNT(*) as count
      FROM "Packet"
      WHERE "rxTime" >= ${hoursAgo}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    res.json({ activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * GET /api/stats/top-nodes
 * Get most active nodes
 */
statsRouter.get('/top-nodes', async (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const topNodes = await prisma.node.findMany({
      take: parseInt(limit as string),
      orderBy: {
        sentPackets: {
          _count: 'desc',
        },
      },
      include: {
        _count: {
          select: {
            sentPackets: true,
            receivedPackets: true,
          },
        },
      },
    });

    res.json({ topNodes });
  } catch (error) {
    console.error('Error fetching top nodes:', error);
    res.status(500).json({ error: 'Failed to fetch top nodes' });
  }
});
