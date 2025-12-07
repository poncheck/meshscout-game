import { prisma } from '@meshscout/database';
import { latLngToCell } from 'h3-js';

/**
 * Database Service for storing Meshtastic data
 */
export class DatabaseService {
  /**
   * Upsert node information
   */
  async upsertNode(nodeData: {
    id: string;
    longName?: string;
    shortName?: string;
    hwModel?: string;
    role?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
  }): Promise<void> {
    try {
      // Calculate H3 index if we have coordinates
      let h3Index: string | undefined;
      if (nodeData.latitude && nodeData.longitude) {
        h3Index = latLngToCell(nodeData.latitude, nodeData.longitude, 8);
      }

      await prisma.node.upsert({
        where: { id: nodeData.id },
        create: {
          id: nodeData.id,
          longName: nodeData.longName,
          shortName: nodeData.shortName,
          hwModel: nodeData.hwModel,
          role: nodeData.role,
          latitude: nodeData.latitude,
          longitude: nodeData.longitude,
          altitude: nodeData.altitude,
          h3Index,
          lastSeen: new Date(),
          firstSeen: new Date(),
        },
        update: {
          longName: nodeData.longName || undefined,
          shortName: nodeData.shortName || undefined,
          hwModel: nodeData.hwModel || undefined,
          role: nodeData.role || undefined,
          latitude: nodeData.latitude || undefined,
          longitude: nodeData.longitude || undefined,
          altitude: nodeData.altitude || undefined,
          h3Index: h3Index || undefined,
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      console.error('Error upserting node:', error);
      throw error;
    }
  }

  /**
   * Store packet data
   */
  async storePacket(packetData: {
    packetId: number;
    fromNodeId: string;
    toNodeId?: string;
    channel: number;
    portnum: number;
    payload?: Buffer;
    payloadText?: string;
    rxTime: Date;
    rxSnr?: number;
    rxRssi?: number;
    hopLimit?: number;
    hopStart?: number;
    wantAck: boolean;
    isTraceroute: boolean;
  }): Promise<string> {
    try {
      // Ensure nodes exist
      await this.ensureNodeExists(packetData.fromNodeId);
      if (packetData.toNodeId) {
        await this.ensureNodeExists(packetData.toNodeId);
      }

      const packet = await prisma.packet.create({
        data: {
          packetId: packetData.packetId,
          fromNodeId: packetData.fromNodeId,
          toNodeId: packetData.toNodeId,
          channel: packetData.channel,
          portnum: packetData.portnum,
          payload: packetData.payload,
          payloadText: packetData.payloadText,
          rxTime: packetData.rxTime,
          rxSnr: packetData.rxSnr,
          rxRssi: packetData.rxRssi,
          hopLimit: packetData.hopLimit,
          hopStart: packetData.hopStart,
          wantAck: packetData.wantAck,
          isTraceroute: packetData.isTraceroute,
        },
      });

      return packet.id;
    } catch (error) {
      console.error('Error storing packet:', error);
      throw error;
    }
  }

  /**
   * Update H3 grid statistics
   */
  async updateH3Grid(h3Index: string, packetCount: number = 1): Promise<void> {
    try {
      await prisma.h3Grid.upsert({
        where: { id: h3Index },
        create: {
          id: h3Index,
          nodeCount: 0,
          packetCount: packetCount,
          lastActivity: new Date(),
        },
        update: {
          packetCount: {
            increment: packetCount,
          },
          lastActivity: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating H3 grid:', error);
    }
  }

  /**
   * Ensure node exists (create minimal entry if not)
   * Handles race conditions where multiple concurrent requests try to create the same node
   */
  private async ensureNodeExists(nodeId: string): Promise<void> {
    try {
      await prisma.node.upsert({
        where: { id: nodeId },
        create: {
          id: nodeId,
          lastSeen: new Date(),
          firstSeen: new Date(),
        },
        update: {
          // Just update lastSeen on conflict - node already exists
          lastSeen: new Date(),
        },
      });
    } catch (error: any) {
      // Ignore unique constraint errors - another concurrent request already created the node
      if (error.code !== 'P2002') {
        console.error(`Error ensuring node ${nodeId} exists:`, error);
      }
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalNodes: number;
    totalPackets: number;
    packetsLast24h: number;
  }> {
    const [totalNodes, totalPackets, packetsLast24h] = await Promise.all([
      prisma.node.count(),
      prisma.packet.count(),
      prisma.packet.count({
        where: {
          rxTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalNodes,
      totalPackets,
      packetsLast24h,
    };
  }
}
