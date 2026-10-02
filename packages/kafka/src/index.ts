import { Kafka, KafkaConfig } from 'kafkajs';

export class KafkaFactory {
  static createClient(config: KafkaConfig) {
    return new Kafka(config);
  }
}