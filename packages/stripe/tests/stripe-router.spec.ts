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
});
