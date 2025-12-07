import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { connectDatabase, prisma } from '@meshscout/database';
import { nodesRouter } from './routes/nodes';
import { packetsRouter } from './routes/packets';
import { leaderboardRouter } from './routes/leaderboard';
import { h3Router } from './routes/h3';
import { statsRouter } from './routes/stats';
import debugRouter from './routes/debug';

const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || '0.0.0.0';

/**
 * Main API Server
 */
class ApiServer {
  private app = express();
  private server = createServer(this.app);
  private wss: WebSocketServer;

  constructor() {
    this.setupMiddleware();
    this.setupRoutes();
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocket();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
    }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });

    // API routes
    this.app.use('/api/nodes', nodesRouter);
    this.app.use('/api/packets', packetsRouter);
    this.app.use('/api/leaderboard', leaderboardRouter);
    this.app.use('/api/debug', debugRouter);
    this.app.use('/api/h3', h3Router);
    this.app.use('/api/stats', statsRouter);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: any, req: any, res: any, next: any) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Setup WebSocket for real-time updates
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      console.log('📡 WebSocket client connected');

      ws.on('message', (message) => {
        console.log('Received:', message.toString());
      });

      ws.on('close', () => {
        console.log('📴 WebSocket client disconnected');
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to MeshScout API',
      }));
    });

    // Broadcast new packets to all connected clients
    // This would be called from the ingestion service or via database triggers
    this.broadcastNewPackets();
  }

  /**
   * Broadcast new packets to WebSocket clients
   */
  private async broadcastNewPackets(): Promise<void> {
    // Poll for new packets every 5 seconds
    setInterval(async () => {
      try {
        const recentPackets = await prisma.packet.findMany({
          take: 10,
          orderBy: { rxTime: 'desc' },
          include: {
            fromNode: true,
            toNode: true,
          },
        });

        if (recentPackets.length > 0 && this.wss.clients.size > 0) {
          const message = JSON.stringify({
            type: 'packets',
            data: recentPackets,
          });

          this.wss.clients.forEach((client) => {
            if (client.readyState === 1) { // OPEN
              client.send(message);
            }
          });
        }
      } catch (error) {
        console.error('Error broadcasting packets:', error);
      }
    }, 5000);
  }

  /**
   * Start the API server
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting MeshScout API Server...\n');

      // Connect to database
      console.log('📦 Connecting to database...');
      const dbConnected = await connectDatabase();
      if (!dbConnected) {
        throw new Error('Failed to connect to database');
      }

      // Start server
      this.server.listen(Number(PORT), HOST, () => {
        console.log(`\n✅ API Server running!`);
        console.log(`   HTTP: http://${HOST}:${PORT}`);
        console.log(`   WebSocket: ws://${HOST}:${PORT}\n`);
      });

    } catch (error) {
      console.error('❌ Failed to start API server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the API server
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Stopping API server...');
    this.wss.close();
    this.server.close();
    console.log('👋 Goodbye!');
  }
}

// Create and start the server
const server = new ApiServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
