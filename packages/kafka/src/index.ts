import { Kafka, KafkaConfig, Consumer } from 'kafkajs';

export class KafkaFactory {
  static createClient(config: KafkaConfig) {
    return new Kafka(config);
  }
}

export class KafkaMeshConsumer {
  private client?: Kafka;
  private consumer?: Consumer;
  private isConnected = false;

  constructor(
    brokers: string[] = ['localhost:9092'],
    clientId = 'ferrox-node-consumer',
    private readonly isMock = false
  ) {
    if (!isMock) {
      this.client = new Kafka({
        clientId,
        brokers,
        retry: {
          retries: 0,
          initialRetryTime: 50,
        },
        connectionTimeout: 500,
      });
    }
  }

  async subscribe(topic: string, groupId = 'ferrox-node-mesh-group', handler: (event: any) => Promise<void>) {
    if (this.isMock) {
      this.isConnected = true;
      return;
    }

    try {
      if (!this.client) return;
      this.consumer = this.client.consumer({ groupId, retry: { retries: 0 } });
      await this.consumer.connect();
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.isConnected = true;

      await this.consumer.run({
        eachMessage: async ({ topic: _t, partition: _p, message }) => {
          if (message.value) {
            const raw = message.value.toString();
            try {
              const event = JSON.parse(raw);
              await handler(event);
            } catch (err) {
              // Ignore non-json payload
            }
          }
        },
      });
    } catch (err) {
      // In local dev without active Kafka daemon, consumer remains safely in standby mode
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.consumer && this.isConnected) {
      try {
        await this.consumer.disconnect();
      } catch (err) {
        // ignore
      }
    }
    this.isConnected = false;
  }

  isOnline() {
    return this.isConnected;
  }
}