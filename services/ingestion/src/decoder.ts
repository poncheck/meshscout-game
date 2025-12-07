import * as crypto from 'crypto';
import * as protobuf from 'protobufjs';
import * as meshtastic from '@meshtastic/protobufs';

/**
 * Meshtastic Message Decoder
 * Handles decryption and decoding of Meshtastic protobuf messages from MQTT
 */
export class MeshtasticDecoder {
  private key: Buffer;

  constructor(keyBase64: string = '1PG7OiApB1nwvP+rz05pAQ==') {
    this.key = Buffer.from(keyBase64, 'base64');
    console.log('🔐 Decoder initialized with encryption key');
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
   * Decode MQTT message envelope using Meshtastic protobuf schemas
   */
  decodeEnvelope(payload: Buffer, topic?: string): any {
    try {
      // Extract metadata from topic
      let channelName = 'default';
      let region = 'unknown';

      if (topic) {
        const parts = topic.split('/');
        if (parts.length >= 6) {
          region = parts[1]; // PL, EU_868, etc.
          channelName = parts[4]; // MediumFast, ShortFast, etc.
        }
      }

      // Parse ServiceEnvelope using Meshtastic protobuf
      const envelope = meshtastic.ServiceEnvelope.decode(payload);

      if (!envelope.packet) {
        console.warn('No packet in envelope');
        return null;
      }

      const meshPacket = envelope.packet;

      // Extract basic packet info
      const result: any = {
        channelId: envelope.channelId || channelName,
        gatewayId: envelope.gatewayId || region,
        packet: {
          id: meshPacket.id || 0,
          from: meshPacket.from || 0,
          to: meshPacket.to || 0,
          channel: meshPacket.channel || 0,
          rxTime: meshPacket.rxTime ? BigInt(meshPacket.rxTime) : BigInt(Math.floor(Date.now() / 1000)),
          rxSnr: meshPacket.rxSnr,
          rxRssi: meshPacket.rxRssi,
          hopLimit: meshPacket.hopLimit,
          hopStart: meshPacket.hopStart,
          wantAck: meshPacket.wantAck || false,
        }
      };

      // Check if packet is encrypted
      if (meshPacket.encrypted && meshPacket.encrypted.length > 0) {
        try {
          // Decrypt the payload
          const decrypted = this.decrypt(
            Buffer.from(meshPacket.encrypted),
            meshPacket.id || 0,
            meshPacket.from || 0
          );

          // Try to decode the decrypted Data message
          const data = meshtastic.Data.decode(decrypted);
          result.packet.decoded = data;
          result.packet.portnum = data.portnum;

          // Parse specific payload types
          if (data.payload && data.portnum) {
            result.packet.parsedPayload = this.parsePayload(data.payload, data.portnum);
          }
        } catch (decryptError) {
          console.warn('Failed to decrypt/decode packet:', decryptError);
          result.packet.encrypted = meshPacket.encrypted;
        }
      } else if (meshPacket.decoded) {
        // Packet is not encrypted
        result.packet.decoded = meshPacket.decoded;
        result.packet.portnum = meshPacket.decoded.portnum;

        if (meshPacket.decoded.payload && meshPacket.decoded.portnum) {
          result.packet.parsedPayload = this.parsePayload(
            meshPacket.decoded.payload,
            meshPacket.decoded.portnum
          );
        }
      }

      return result;
    } catch (error) {
      console.error('Error decoding envelope:', error);
      // Fallback to basic topic parsing
      return this.fallbackDecode(payload, topic);
    }
  }

  /**
   * Fallback decoder wenn protobuf parsing fails
   */
  private fallbackDecode(payload: Buffer, topic?: string): any {
    let nodeId = 0;
    let channelName = 'default';
    let region = 'unknown';

    if (topic) {
      const parts = topic.split('/');
      if (parts.length >= 6) {
        region = parts[1];
        channelName = parts[4];
        const nodeIdPart = parts[5];
        if (nodeIdPart && nodeIdPart.startsWith('!')) {
          nodeId = parseInt(nodeIdPart.substring(1), 16);
        }
      }
    }

    return {
      channelId: channelName,
      gatewayId: region,
      packet: {
        id: Math.floor(Math.random() * 1000000),
        from: nodeId,
        to: 0,
        channel: 0,
        rxTime: BigInt(Math.floor(Date.now() / 1000)),
        encrypted: payload,
      }
    };
  }

  /**
   * Parse specific payload types (Position, NodeInfo, etc.)
   */
  private parsePayload(payload: Uint8Array, portnum: number): any {
    try {
      // PortNum enum values from Meshtastic
      // NODEINFO_APP = 4
      // POSITION_APP = 3
      // TEXT_MESSAGE_APP = 1
      // TELEMETRY_APP = 67
      // TRACEROUTE_APP = 70

      if (portnum === 3) { // POSITION_APP
        const position = meshtastic.Position.decode(payload);
        return {
          type: 'position',
          latitude: position.latitudeI ? position.latitudeI / 1e7 : null,
          longitude: position.longitudeI ? position.longitudeI / 1e7 : null,
          altitude: position.altitude,
          time: position.time,
        };
      } else if (portnum === 4) { // NODEINFO_APP
        const nodeInfo = meshtastic.User.decode(payload);
        return {
          type: 'nodeinfo',
          id: nodeInfo.id,
          longName: nodeInfo.longName,
          shortName: nodeInfo.shortName,
          hwModel: nodeInfo.hwModel,
          role: nodeInfo.role,
        };
      } else if (portnum === 1) { // TEXT_MESSAGE_APP
        return {
          type: 'text',
          text: Buffer.from(payload).toString('utf8'),
        };
      } else if (portnum === 70) { // TRACEROUTE_APP
        const traceroute = meshtastic.RouteDiscovery.decode(payload);
        return {
          type: 'traceroute',
          route: traceroute.route || [],
        };
      }

      return {
        type: 'unknown',
        portnum,
        payloadHex: Buffer.from(payload).toString('hex').substring(0, 100),
      };
    } catch (error) {
      console.error('Error parsing payload:', error);
      return null;
    }
  }

  /**
   * Process complete MQTT message
   */
  async processMessage(topic: string, payload: Buffer): Promise<any> {
    try {
      console.log(`📨 Processing message from topic: ${topic}`);

      // Decode the envelope (pass topic for node ID extraction)
      const envelope = this.decodeEnvelope(payload, topic);
      if (!envelope || !envelope.packet) {
        console.warn('Invalid envelope or no packet');
        return null;
      }

      const packet = envelope.packet;

      // Extract packet details
      const result: any = {
        topic,
        channelId: envelope.channelId,
        gatewayId: envelope.gatewayId,
        packetId: packet.id,
        from: packet.from,
        to: packet.to,
        channel: packet.channel || 0,
        rxTime: packet.rxTime ? new Date(Number(packet.rxTime) * 1000) : new Date(),
        rxSnr: packet.rxSnr,
        rxRssi: packet.rxRssi,
        hopLimit: packet.hopLimit,
        hopStart: packet.hopStart,
        wantAck: packet.wantAck || false,
        portnum: packet.portnum,
        parsedPayload: packet.parsedPayload, // Include parsed payload from decodeEnvelope
      };

      // Check if packet is encrypted
      if (packet.encrypted && packet.encrypted.length > 0) {
        result.isEncrypted = true;
      } else if (packet.decoded) {
        // Packet is not encrypted
        result.isEncrypted = false;
        result.decoded = packet.decoded;
        result.payload = packet.decoded.payload;
      }

      return result;
    } catch (error) {
      console.error('Error processing message:', error);
      return null;
    }
  }

  /**
   * Extract node information from packet
   */
  extractNodeInfo(packetData: any): { nodeId: string; lat?: number; lon?: number; alt?: number; shortName?: string; longName?: string } | null {
    try {
      const nodeInfo: any = {
        nodeId: packetData.from.toString()
      };

      // Check for position data in parsedPayload
      if (packetData.parsedPayload?.type === 'position') {
        nodeInfo.lat = packetData.parsedPayload.latitude;
        nodeInfo.lon = packetData.parsedPayload.longitude;
        nodeInfo.alt = packetData.parsedPayload.altitude;
      }

      // Check for node info in parsedPayload
      if (packetData.parsedPayload?.type === 'nodeinfo') {
        nodeInfo.shortName = packetData.parsedPayload.shortName;
        nodeInfo.longName = packetData.parsedPayload.longName;
      }

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
