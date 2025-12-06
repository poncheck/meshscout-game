import * as crypto from 'crypto';
import * as protobuf from 'protobufjs';

/**
 * Meshtastic Message Decoder
 * Handles decryption and decoding of Meshtastic protobuf messages from MQTT
 */
export class MeshtasticDecoder {
  private key: Buffer;
  private root: protobuf.Root | null = null;

  constructor(keyBase64: string = '1PG7OiApB1nwvP+rz05pAQ==') {
    this.key = Buffer.from(keyBase64, 'base64');
    console.log('🔐 Decoder initialized with encryption key');
    this.initializeProtobuf();
  }

  /**
   * Initialize protobuf definitions
   */
  private async initializeProtobuf() {
    try {
      // For now, we'll handle raw protobuf data
      // You can load proper .proto files when available
      console.log('Protobuf decoder ready');
    } catch (error) {
      console.warn('Protobuf initialization warning:', error);
    }
  }

  /**
   * Decrypt Meshtastic packet using AES-128-CTR
   * Based on Meshtastic protocol specification
   */
  decrypt(encryptedData: Buffer, packetId: number, fromNode: number): Buffer {
    try {
      // Create nonce: packet_id (4 bytes LE) + from_node (4 bytes LE) + padding (8 zeros)
      const nonce = Buffer.alloc(16);
      nonce.writeUInt32LE(packetId, 0);
      nonce.writeUInt32LE(fromNode, 4);

      // Decrypt using AES-128-CTR
      const decipher = crypto.createDecipheriv('aes-128-ctr', this.key, nonce);
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Decode MQTT message envelope
   */
  decodeEnvelope(payload: Buffer): any {
    try {
      // Basic protobuf parsing
      // ServiceEnvelope structure: channelId, gatewayId, packet
      // For now, return raw data structure

      return {
        raw: payload,
        size: payload.length,
        hex: payload.toString('hex').substring(0, 100) + '...'
      };
    } catch (error) {
      console.error('Error decoding envelope:', error);
      return null;
    }
  }

  /**
   * Process complete MQTT message
   */
  async processMessage(topic: string, payload: Buffer): Promise<any> {
    try {
      console.log(`📨 Processing message from topic: ${topic} (${payload.length} bytes)`);

      // Parse topic to extract information
      // Format: msh/{region}/{modem_preset}/e/{gateway_id}
      const topicParts = topic.split('/');

      const result: any = {
        topic,
        topicParts: {
          region: topicParts[1] || 'unknown',
          modemPreset: topicParts[2] || 'unknown',
          gatewayId: topicParts[4] || 'unknown'
        },
        payloadSize: payload.length,
        payloadHex: payload.toString('hex').substring(0, 200),
        timestamp: new Date(),
        // Basic packet ID extraction (first 4 bytes as little-endian)
        packetId: payload.length >= 4 ? payload.readUInt32LE(0) : 0,
        // Attempt to extract from/to node IDs
        from: this.extractNodeId(payload, 4),
        to: this.extractNodeId(payload, 8),
      };

      return result;
    } catch (error) {
      console.error('Error processing message:', error);
      return null;
    }
  }

  /**
   * Extract node ID from payload at offset
   */
  private extractNodeId(payload: Buffer, offset: number): number | undefined {
    try {
      if (payload.length >= offset + 4) {
        return payload.readUInt32LE(offset);
      }
    } catch (error) {
      // Ignore extraction errors
    }
    return undefined;
  }

  /**
   * Extract node information from packet
   */
  extractNodeInfo(packetData: any): { nodeId: string; lat?: number; lon?: number; alt?: number } | null {
    try {
      if (!packetData.from) return null;

      const nodeInfo: any = {
        nodeId: packetData.from.toString()
      };

      return nodeInfo;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if packet is a traceroute
   */
  isTraceroute(packetData: any): boolean {
    // Traceroute packets use portnum TRACEROUTE_APP (70)
    return packetData.portnum === 70 || packetData.decoded?.portnum === 70;
  }
}
