import * as crypto from 'crypto';
import { create } from '@bufbuild/protobuf';
import { ServiceEnvelope } from '@buf/meshtastic_protobufs.bufbuild_es/meshtastic/mqtt_pb';

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
   * Decode MQTT message envelope
   */
  decodeEnvelope(payload: Buffer): any {
    try {
      // Parse ServiceEnvelope from protobuf
      const envelope = ServiceEnvelope.fromBinary(new Uint8Array(payload));

      return {
        channelId: envelope.channelId,
        gatewayId: envelope.gatewayId,
        packet: envelope.packet
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
      console.log(`📨 Processing message from topic: ${topic}`);

      // Decode the envelope
      const envelope = this.decodeEnvelope(payload);
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
      };

      // Check if packet is encrypted
      if (packet.encrypted && packet.encrypted.length > 0) {
        try {
          const decrypted = this.decrypt(
            Buffer.from(packet.encrypted),
            packet.id,
            packet.from
          );
          result.decrypted = decrypted;
          result.isEncrypted = true;

          // Try to decode the decrypted payload
          // This would contain the actual Data protobuf
          result.payloadHex = decrypted.toString('hex');
        } catch (decryptError) {
          console.warn('Failed to decrypt packet:', decryptError);
          result.isEncrypted = true;
          result.decryptionFailed = true;
        }
      } else if (packet.decoded) {
        // Packet is not encrypted
        result.isEncrypted = false;
        result.decoded = packet.decoded;
        result.portnum = packet.decoded.portnum;
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
  extractNodeInfo(packetData: any): { nodeId: string; lat?: number; lon?: number; alt?: number } | null {
    try {
      if (!packetData.decoded) return null;

      const decoded = packetData.decoded;
      const nodeInfo: any = {
        nodeId: packetData.from.toString()
      };

      // Check for position data
      if (decoded.position) {
        nodeInfo.lat = decoded.position.latitudeI ? decoded.position.latitudeI / 1e7 : undefined;
        nodeInfo.lon = decoded.position.longitudeI ? decoded.position.longitudeI / 1e7 : undefined;
        nodeInfo.alt = decoded.position.altitude;
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
