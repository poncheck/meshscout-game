import { Router } from 'express';
import { prisma } from '@meshscout/database';

export const nodesRouter = Router();

/**
 * GET /api/nodes
 * Get all nodes with optional filtering
 */
nodesRouter.get('/', async (req, res) => {
  try {
    const { limit = '100', offset = '0', active } = req.query;

    const where: any = {};

    // Filter for active nodes (seen in last 24h)
    if (active === 'true') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      where.lastSeen = {
        gte: oneDayAgo,
      };
    }

    const nodes = await prisma.node.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { lastSeen: 'desc' },
    });

    const total = await prisma.node.count({ where });

    res.json({
      nodes,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

/**
 * GET /api/nodes/:id
 * Get specific node by ID
 */
nodesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const node = await prisma.node.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sentPackets: true,
            receivedPackets: true,
          },
        },
      },
    });

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(node);
  } catch (error) {
    console.error('Error fetching node:', error);
    res.status(500).json({ error: 'Failed to fetch node' });
  }
});

/**
 * GET /api/nodes/:id/packets
 * Get packets for a specific node
 */
nodesRouter.get('/:id/packets', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const packets = await prisma.packet.findMany({
      where: {
        OR: [
          { fromNodeId: id },
          { toNodeId: id },
        ],
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { rxTime: 'desc' },
      include: {
        fromNode: true,
        toNode: true,
      },
    });

    res.json({ packets });
  } catch (error) {
    console.error('Error fetching node packets:', error);
    res.status(500).json({ error: 'Failed to fetch packets' });
  }
});
