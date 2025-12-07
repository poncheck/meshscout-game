import { Router } from 'express';
import { prisma } from '@meshscout/database';

const router = Router();

/**
 * GET /api/debug/packets
 * Get recent packets with all details for debugging
 */
router.get('/packets', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const packets = await prisma.packet.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fromNode: true,
        toNode: true
      }
    });

    res.json({
      count: packets.length,
      packets: packets.map(p => ({
        id: p.id,
        packetId: p.packetId,
        from: p.fromNodeId,
        to: p.toNodeId,
        channel: p.channel,
        portnum: p.portnum,
        rxTime: p.rxTime,
        rxSnr: p.rxSnr,
        rxRssi: p.rxRssi,
        hopLimit: p.hopLimit,
        hopStart: p.hopStart,
        isTraceroute: p.isTraceroute,
        payload: p.payload ? p.payload.toString('hex').substring(0, 100) : null,
        createdAt: p.createdAt,
        fromNode: p.fromNode ? {
          id: p.fromNode.id,
          latitude: p.fromNode.latitude,
          longitude: p.fromNode.longitude,
          shortName: p.fromNode.shortName,
          longName: p.fromNode.longName
        } : null,
        toNode: p.toNode ? {
          id: p.toNode.id,
          latitude: p.toNode.latitude,
          longitude: p.toNode.longitude
        } : null
      }))
    });
  } catch (error) {
    console.error('Error fetching debug packets:', error);
    res.status(500).json({ error: 'Failed to fetch packets' });
  }
});

/**
 * GET /api/debug/nodes
 * Get all nodes with details
 */
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await prisma.node.findMany({
      include: {
        _count: {
          select: {
            sentPackets: true,
            receivedPackets: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({
      count: nodes.length,
      nodes: nodes.map(n => ({
        id: n.id,
        shortName: n.shortName,
        longName: n.longName,
        latitude: n.latitude,
        longitude: n.longitude,
        altitude: n.altitude,
        hwModel: n.hwModel,
        role: n.role,
        h3Index: n.h3Index,
        sentPackets: n._count.sentPackets,
        receivedPackets: n._count.receivedPackets,
        lastSeen: n.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching debug nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

/**
 * GET /api/debug/raw-data
 * Get raw database stats
 */
router.get('/raw-data', async (req, res) => {
  try {
    const [packetCount, nodeCount, uniqueFromNodes, uniqueToNodes] = await Promise.all([
      prisma.packet.count(),
      prisma.node.count(),
      prisma.packet.groupBy({
        by: ['fromNodeId'],
        _count: true
      }),
      prisma.packet.groupBy({
        by: ['toNodeId'],
        _count: true,
        where: {
          toNodeId: {
            not: null
          }
        }
      })
    ]);

    res.json({
      packets: packetCount,
      nodes: nodeCount,
      uniqueFromNodes: uniqueFromNodes.length,
      uniqueToNodes: uniqueToNodes.length,
      nodeIdsFromPackets: uniqueFromNodes.slice(0, 20).map(n => ({
        nodeId: n.fromNodeId,
        count: n._count
      }))
    });
  } catch (error) {
    console.error('Error fetching raw data:', error);
    res.status(500).json({ error: 'Failed to fetch raw data' });
  }
});

export default router;
