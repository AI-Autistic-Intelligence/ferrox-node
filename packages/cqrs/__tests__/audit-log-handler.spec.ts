import * as crypto from 'crypto';
import { AuditLogHandler, OrderSettledEvent } from '../src/cqrs/audit-log-handler';
import { KafkaMeshConsumer } from '../../kafka/src/index';

describe('Living Mesh: AuditLogHandler CQRS & Kafka Transport Suite', () => {
  const sharedKey = 'ferrox_mesh_audit_secret_key_32b';
  let handler: AuditLogHandler;

  beforeEach(() => {
    handler = new AuditLogHandler(sharedKey);
  });

  function createValidSignedEvent(orderId = 'ORD-SETTLED-001', volume = 1.5, price = 96800): OrderSettledEvent {
    const asset = 'BTC/USD';
    const ledgerTxId = 'TX-LOOM-882194';
    const payload = `${orderId}:${asset}:${volume}:${price}:${ledgerTxId}`;
    const signature = crypto.createHmac('sha256', sharedKey).update(payload).digest('hex');

    return {
      specversion: '1.0',
      type: 'orders.settled.v1',
      source: '/mesh/java-loom/ledger',
      id: `EVT-${Date.now()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: {
        orderId,
        asset,
        volume,
        price,
        settledBy: 'Java-21-Project-Loom',
        ledgerTxId,
        debitAmountCents: 14520000,
        creditAmountCents: 14520000,
        driftCents: 0, // Strict Zero-Drift Invariant
        signature,
      },
    };
  }

  describe('1. Cryptographic Signature & Zero-Drift Verification', () => {
    it('should verify compliant settled orders and record zero accounting drift', async () => {
      const event = createValidSignedEvent('ORD-SUCCESS-101', 2.0, 96500);
      const record = await handler.handle(event);

      expect(record.status).toBe('COMPLIANT');
      expect(record.signatureValid).toBe(true);
      expect(record.zeroDriftVerified).toBe(true);
      expect(record.orderId).toBe('ORD-SUCCESS-101');
      expect(record.auditHash).toHaveLength(64);

      const telemetry = handler.getTelemetry();
      expect(telemetry.totalAudited).toBe(1);
      expect(telemetry.validSignatures).toBe(1);
      expect(telemetry.zeroDriftCount).toBe(1);
      expect(telemetry.complianceRate).toBe(100);
    });

    it('should reject tampered cryptographic signatures', async () => {
      const event = createValidSignedEvent('ORD-TAMPERED-002');
      // Corrupt signature
      event.data.signature = 'tampered_invalid_signature_32_bytes_long';

      const record = await handler.handle(event);

      expect(record.status).toBe('SIGNATURE_REJECTED');
      expect(record.signatureValid).toBe(false);

      const telemetry = handler.getTelemetry();
      expect(telemetry.totalAudited).toBe(1);
      expect(telemetry.validSignatures).toBe(0);
      expect(telemetry.complianceRate).toBe(0);
    });

    it('should flag accounting drift when debits do not match credits', async () => {
      const event = createValidSignedEvent('ORD-DRIFT-003');
      // Incur a drift
      event.data.creditAmountCents = 14520000;
      event.data.debitAmountCents = 14519500; // 500 cents drift
      event.data.driftCents = 500;

      const record = await handler.handle(event);

      expect(record.status).toBe('DRIFT_DETECTED');
      expect(record.zeroDriftVerified).toBe(false);
      expect(record.signatureValid).toBe(true);
    });
  });

  describe('2. Kafka Mesh Consumer & Topic Subscription', () => {
    it('should initialize KafkaMeshConsumer configured for orders.settled.v1', async () => {
      const consumer = new KafkaMeshConsumer(['localhost:9092'], 'ferrox-node-test-group', true);
      expect(consumer).toBeDefined();

      let receivedEvent: any = null;
      await consumer.subscribe('orders.settled.v1', 'test-group', async (event) => {
        receivedEvent = event;
      });

      // Verify clean disconnection
      await consumer.disconnect();
      expect(consumer.isOnline()).toBe(false);
      expect(receivedEvent).toBeNull();
    });
  });
});
