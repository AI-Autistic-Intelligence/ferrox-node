import { KafkaFactory } from '../src/index';

describe('KafkaFactory', () => {
  it('should initialize Kafka', () => {
    const client = KafkaFactory.createClient({ clientId: 'test', brokers: ['localhost:9092'] });
    expect(client).toBeDefined();
  });
});
