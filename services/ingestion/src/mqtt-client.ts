import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';

export interface MqttConfig {
  broker: string;
  port?: number;
  username?: string;
  password?: string;
  clientId?: string;
  topic: string;
}

/**
 * MQTT Client for Meshtastic network
 */
export class MeshtasticMqttClient extends EventEmitter {
  private client: MqttClient | null = null;
  private config: MqttConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: MqttConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const brokerUrl = `${this.config.broker}${this.config.port ? ':' + this.config.port : ''}`;

      console.log(`🔌 Connecting to MQTT broker: ${brokerUrl}`);

      const options: mqtt.IClientOptions = {
        clientId: this.config.clientId || `meshscout-${Math.random().toString(16).slice(2, 10)}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      };

      if (this.config.username) {
        options.username = this.config.username;
        options.password = this.config.password;
      }

      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log('✅ Connected to MQTT broker');
        this.reconnectAttempts = 0;
        this.subscribe();
        resolve();
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT error:', error);
        this.emit('error', error);
      });

      this.client.on('message', (topic, payload) => {
        this.emit('message', topic, payload);
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting to MQTT... (attempt ${this.reconnectAttempts})`);

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('❌ Max reconnect attempts reached');
          this.client?.end();
          reject(new Error('Max reconnect attempts reached'));
        }
      });

      this.client.on('offline', () => {
        console.warn('⚠️  MQTT client offline');
      });

      this.client.on('close', () => {
        console.log('🔌 MQTT connection closed');
      });
    });
  }

  /**
   * Subscribe to Meshtastic topic
   */
  private subscribe(): void {
    if (!this.client) return;

    this.client.subscribe(this.config.topic, (err) => {
      if (err) {
        console.error('❌ Subscription error:', err);
        this.emit('error', err);
      } else {
        console.log(`📡 Subscribed to topic: ${this.config.topic}`);
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, {}, () => {
          console.log('👋 Disconnected from MQTT broker');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }
}
