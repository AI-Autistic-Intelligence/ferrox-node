import 'reflect-metadata';
import { SecurityService } from '../src/services/security.service';
import { OrderSagaService } from '../src/services/order-saga.service';
import { BackgroundJobService } from '../src/services/background-job.service';
import { loadConfig } from '../src/config/app.config';
import { GlobalMetricsEngine } from '@ferrox-node/observability';

describe('Ferrox-Node Enterprise Showcase E2E Suite', () => {
  const config = loadConfig();
  let securityService: SecurityService;
  let orderSagaService: OrderSagaService;
  let backgroundJobService: BackgroundJobService;

  beforeAll(async () => {
    GlobalMetricsEngine.init();
    securityService = new SecurityService(config);
    orderSagaService = new OrderSagaService();
    backgroundJobService = new BackgroundJobService(config);
    await backgroundJobService.init();
  });

  afterAll(async () => {
    await backgroundJobService.stop();
    GlobalMetricsEngine.destroy();
  });

  describe('1. Security Engine (PASETO v4 & TOTP 2FA)', () => {
    it('should generate and verify PASETO v4.local symmetric tokens', () => {
      const token = securityService.generatePasetoToken('usr_test_99', ['admin', 'billing']);
      expect(token).toMatch(/^v4\.local\./);

      const decoded = securityService.verifyPasetoToken(token);
      expect(decoded.sub).toBe('usr_test_99');
      expect(decoded.roles).toContain('admin');
      expect(decoded.roles).toContain('billing');
    });

    it('should generate valid TOTP 2FA secrets and verify correct codes', () => {
      const { secret, uri } = securityService.setupTotp('usr_test_99');
      expect(secret).toBeDefined();
      expect(uri).toContain('otpauth://totp/');

      // Verification with generated code
      const totpHelper = new (require('@ferrox-node/security').TotpAuthService)();
      // Generate current step code
      const currentStep = Math.floor(Date.now() / 1000 / 30);
      const validCode = (totpHelper as any).generateCodeForStep(secret, currentStep);

      const isValid = securityService.verifyTotp(secret, validCode);
      expect(isValid).toBe(true);

      const isInvalid = securityService.verifyTotp(secret, '000000');
      expect(isInvalid).toBe(false);
    });
  });

  describe('2. Distributed CQRS SAGA (AcidSagaCoordinator)', () => {
    it('should execute Multi-Warehouse fallback when primary warehouse is out of stock', async () => {
      // PROD-A has 0 units in WH-ROME and 15 units in WH-MILAN.
      const result = await orderSagaService.executeCheckoutSaga({
        orderId: 'ORD-TEST-FALLBACK-01',
        productId: 'PROD-A',
        quantity: 2,
        customerId: 'CUST-001',
        totalCents: 5000,
        paymentMethod: 'CREDIT_CARD'
      });

      expect(result.status).toBe('FULFILLED');
      expect(result.assignedWarehouse).toBe('WH-MILAN');
      expect(result.paymentTransactionId).toBeDefined();
    });

    it('should execute reverse compensating transactions on payment failure', async () => {
      const initialStockMilan = orderSagaService.getWarehouseStock()['WH-MILAN']['PROD-A'];

      const result = await orderSagaService.executeCheckoutSaga({
        orderId: 'ORD-TEST-FAIL-01',
        productId: 'PROD-A',
        quantity: 3,
        customerId: 'CUST-002',
        totalCents: 7500,
        paymentMethod: 'CREDIT_CARD',
        simulatePaymentFailure: true
      });

      expect(result.status).toBe('REFUNDED');
      expect(result.error).toContain('Payment gateway card decline');

      // Verify compensation restored warehouse stock
      const postStockMilan = orderSagaService.getWarehouseStock()['WH-MILAN']['PROD-A'];
      expect(postStockMilan).toBe(initialStockMilan);
    });
  });

  describe('3. Reliable Queue Worker (Redis BRPOPLPUSH)', () => {
    it('should enqueue and reliably process background tasks', async () => {
      const jobId = await backgroundJobService.enqueue({
        taskType: 'SEND_INVOICE_EMAIL',
        customerEmail: 'customer@ferrox.dev'
      });

      expect(jobId).toMatch(/^job_/);

      // Wait brief tick for async worker
      await new Promise((r) => setTimeout(r, 120));

      const job = backgroundJobService.getJob(jobId);
      expect(job).not.toBeNull();
      expect(job?.status).toBe('COMPLETED');
    });
  });

  describe('4. Observability & Prometheus Metrics Engine', () => {
    it('should export valid Prometheus telemetry on /metrics', async () => {
      GlobalMetricsEngine.sampleMetrics();
      const metrics = await GlobalMetricsEngine.getMetricsString();

      expect(metrics).toContain('ferrox_sys_event_loop_lag_ms');
      expect(metrics).toContain('ferrox_sys_memory_heap_used_bytes');
    });
  });
});
