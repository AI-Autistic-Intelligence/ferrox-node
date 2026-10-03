import { StripeWebhookRouter } from '../src/index';
import Stripe from 'stripe';

describe('StripeWebhookRouter', () => {
  it('should route events to proper handlers', async () => {
    const router = new StripeWebhookRouter('sk_test_123', 'whsec_456');

    // We mock constructEvent to just parse JSON since we are not testing Stripe's crypto
    (router as any).client = {
      webhooks: {
        constructEvent: (raw: string) => JSON.parse(raw) as Stripe.Event
      }
    };

    const invoiceHandler = jest.fn().mockResolvedValue(undefined);
    const wildcardHandler = jest.fn().mockResolvedValue(undefined);

    router.on('invoice.paid', invoiceHandler);
    router.on('*', wildcardHandler);

    await router.handleWebhook(JSON.stringify({ id: 'evt_1', type: 'invoice.paid' }), 'sig');

    expect(invoiceHandler).toHaveBeenCalledTimes(1);
    expect(wildcardHandler).toHaveBeenCalledTimes(1);

    await router.handleWebhook(JSON.stringify({ id: 'evt_2', type: 'customer.created' }), 'sig');

    expect(invoiceHandler).toHaveBeenCalledTimes(1); // not called again
    expect(wildcardHandler).toHaveBeenCalledTimes(2); // called again for wildcard
  });

  it('should throw an error if constructEvent throws (signature validation fails)', async () => {
    const router = new StripeWebhookRouter('sk_test_123', 'whsec_456');
    (router as any).client = {
      webhooks: {
        constructEvent: () => { throw new Error('Invalid signature'); }
      }
    };
    await expect(router.handleWebhook('raw', 'sig')).rejects.toThrow('Webhook Error: Invalid signature');
  });

  it('should not do anything if no handlers are registered', async () => {
    const router = new StripeWebhookRouter('sk_test_123', 'whsec_456');
    (router as any).client = {
      webhooks: {
        constructEvent: (raw: string) => JSON.parse(raw) as Stripe.Event
      }
    };
    await expect(router.handleWebhook(JSON.stringify({ id: 'evt_3', type: 'invoice.created' }), 'sig')).resolves.toBeUndefined();
  });

  it('should propagate errors thrown by handlers', async () => {
    const router = new StripeWebhookRouter('sk_test_123', 'whsec_456');
    (router as any).client = {
      webhooks: {
        constructEvent: (raw: string) => JSON.parse(raw) as Stripe.Event
      }
    };
    router.on('invoice.payment_failed', () => Promise.reject(new Error('Handler explosion')));
    await expect(router.handleWebhook(JSON.stringify({ id: 'evt_4', type: 'invoice.payment_failed' }), 'sig')).rejects.toThrow('Handler explosion');
  });

  it('should support multiple handlers for the same event type', async () => {
    const router = new StripeWebhookRouter('sk_test_123', 'whsec_456');
    (router as any).client = {
      webhooks: {
        constructEvent: (raw: string) => JSON.parse(raw) as Stripe.Event
      }
    };
    
    const handler1 = jest.fn().mockResolvedValue(undefined);
    const handler2 = jest.fn().mockResolvedValue(undefined);
    
    router.on('charge.succeeded', handler1);
    router.on('charge.succeeded', handler2); // This triggers the false branch of if (!has)
    
    await router.handleWebhook(JSON.stringify({ id: 'evt_5', type: 'charge.succeeded' }), 'sig');
    
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
