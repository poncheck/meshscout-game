import 'dotenv/config';
import { MeshtasticMqttClient } from './mqtt-client';
import { MeshtasticDecoder } from './decoder';
import { DatabaseService } from './database-service';
import { connectDatabase } from '@meshscout/database';

/**
 * Main Ingestion Service
 * Connects to MQTT, decodes Meshtastic packets, and stores them in database
 */
class IngestionService {
  private mqttClient: MeshtasticMqttClient;
  private decoder: MeshtasticDecoder;
  private dbService: DatabaseService;
  private packetsProcessed = 0;
  private packetsErrors = 0;
  private startTime = Date.now();

  constructor() {
    // Initialize MQTT client
    this.mqttClient = new MeshtasticMqttClient({
      broker: process.env.MQTT_BROKER || 'mqtt://localhost',
      port: process.env.MQTT_PORT ? parseInt(process.env.MQTT_PORT) : undefined,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: process.env.MQTT_CLIENT_ID || 'meshscout-ingestion',
      topic: process.env.MQTT_TOPIC || 'msh/+/2/e/#',
    });

    // Initialize decoder
    this.decoder = new MeshtasticDecoder(
      process.env.MESHTASTIC_KEY || '1PG7OiApB1nwvP+rz05pAQ=='
    );

    // Initialize database service
    this.dbService = new DatabaseService();

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup MQTT event handlers
   */
  private setupEventHandlers(): void {
    this.mqttClient.on('message', async (topic: string, payload: Buffer) => {
      await this.handleMessage(topic, payload);
    });

    this.mqttClient.on('error', (error: Error) => {
      console.error('MQTT Error:', error);
    });
  }

  /**
   * Handle incoming MQTT message
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      // Decode the message
      const decoded = await this.decoder.processMessage(topic, payload);
      if (!decoded) {
        this.packetsErrors++;
        return;
      }

      // Store packet in database
      const packetId = await this.dbService.storePacket({
        packetId: decoded.packetId,
        fromNodeId: decoded.from.toString(),
        toNodeId: decoded.to ? decoded.to.toString() : undefined,
        channel: decoded.channel,
        portnum: decoded.portnum || 0,
        payload: decoded.payload,
        payloadText: decoded.payloadText,
        rxTime: decoded.rxTime,
        rxSnr: decoded.rxSnr,
        rxRssi: decoded.rxRssi,
        hopLimit: decoded.hopLimit,
        hopStart: decoded.hopStart,
        wantAck: decoded.wantAck,
        isTraceroute: this.decoder.isTraceroute(decoded),
      });

      // Extract and update node information if available
      const nodeInfo = this.decoder.extractNodeInfo(decoded);
      if (nodeInfo) {
        await this.dbService.upsertNode({
          id: nodeInfo.nodeId,
          latitude: nodeInfo.lat,
          longitude: nodeInfo.lon,
          altitude: nodeInfo.alt,
          shortName: nodeInfo.shortName,
          longName: nodeInfo.longName,
        });
      }

      this.packetsProcessed++;

      // Log progress every 100 packets
      if (this.packetsProcessed % 100 === 0) {
        this.printStats();
      }

    } catch (error) {
      this.packetsErrors++;
      console.error('Error handling message:', error);
    }
  }

  /**
   * Print service statistics
   */
  private printStats(): void {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const rate = this.packetsProcessed / (uptime || 1);

    console.log(`
📊 Statistics:
   Packets processed: ${this.packetsProcessed}
   Errors: ${this.packetsErrors}
   Uptime: ${uptime}s
   Rate: ${rate.toFixed(2)} packets/s
    `);
  }

  /**
   * Start the ingestion service
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting MeshScout Ingestion Service...\n');

      // Connect to database
      console.log('📦 Connecting to database...');
      const dbConnected = await connectDatabase();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      // Connect to MQTT
      await this.mqttClient.connect();

      console.log('\n✅ Ingestion service started successfully!');
      console.log('📡 Listening for Meshtastic packets...\n');

      // Print stats every 60 seconds
      setInterval(() => {
        this.printStats();
      }, 60000);

    } catch (error) {
      console.error('❌ Failed to start ingestion service:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the ingestion service
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Stopping ingestion service...');
    await this.mqttClient.disconnect();
    this.printStats();
    console.log('👋 Goodbye!');
  }
}

// Create and start the service
const service = new IngestionService();

// Graceful shutdown
process.on('SIGINT', async () => {
  await service.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await service.stop();
  process.exit(0);
});

// Start the service
service.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
