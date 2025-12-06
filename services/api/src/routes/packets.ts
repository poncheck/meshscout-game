import { Router } from 'express';
import { prisma } from '@meshscout/database';

export const packetsRouter = Router();

/**
 * GET /api/packets
 * Get all packets with optional filtering
 */
packetsRouter.get('/', async (req, res) => {
  try {
    const { limit = '50', offset = '0', traceroute } = req.query;

    const where: any = {};

    // Filter for traceroute packets only
    if (traceroute === 'true') {
      where.isTraceroute = true;
    }

    const packets = await prisma.packet.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { rxTime: 'desc' },
      include: {
        fromNode: {
          select: {
            id: true,
            shortName: true,
            longName: true,
            latitude: true,
            longitude: true,
          },
        },
        toNode: {
          select: {
            id: true,
            shortName: true,
            longName: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    const total = await prisma.packet.count({ where });

    res.json({
      packets,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching packets:', error);
    res.status(500).json({ error: 'Failed to fetch packets' });
  }
});

/**
 * GET /api/packets/:id
 * Get specific packet by ID
 */
packetsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const packet = await prisma.packet.findUnique({
      where: { id },
      include: {
        fromNode: true,
        toNode: true,
        hops: {
          include: {
            node: true,
          },
          orderBy: { hopNumber: 'asc' },
        },
      },
    });

    if (!packet) {
      return res.status(404).json({ error: 'Packet not found' });
    }

    res.json(packet);
  } catch (error) {
    console.error('Error fetching packet:', error);
    res.status(500).json({ error: 'Failed to fetch packet' });
  }
});

/**
 * GET /api/packets/recent
 * Get recent packets for live updates
 */
packetsRouter.get('/recent', async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since as string) : new Date(Date.now() - 60000);

    const packets = await prisma.packet.findMany({
      where: {
        rxTime: {
          gte: sinceDate,
        },
      },
      take: 100,
      orderBy: { rxTime: 'desc' },
      include: {
        fromNode: {
          select: {
            id: true,
            shortName: true,
            latitude: true,
            longitude: true,
          },
        },
        toNode: {
          select: {
            id: true,
            shortName: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    res.json({ packets });
  } catch (error) {
    console.error('Error fetching recent packets:', error);
    res.status(500).json({ error: 'Failed to fetch recent packets' });
  }
});
