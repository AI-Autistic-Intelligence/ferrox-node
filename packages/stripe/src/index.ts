import Stripe from 'stripe';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('StripeWebhookRouter');

type StripeWebhookHandler = (event: Stripe.Event) => Promise<void>;

export class StripeWebhookRouter {
  private client: Stripe;
  private webhookSecret: string;
  private handlers = new Map<string, StripeWebhookHandler[]>();

  constructor(secretKey: string, webhookSecret: string) {
    this.client = new Stripe(secretKey, { apiVersion: '2024-04-10' });
    this.webhookSecret = webhookSecret;
    logger.log('Stripe Webhook Router initialized');
  }

  /**
   * Register a handler for a specific Stripe Event (e.g., 'invoice.paid')
   */
  public on(eventType: Stripe.Event.Type | '*', handler: StripeWebhookHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Validates and dispatches the raw webhook payload to registered handlers
   */
  public async handleWebhook(rawBody: string | Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      logger?.debug?.(`[Stripe Webhook] Validated event ${event.id} of type ${event.type}`);
    } catch (err: any) {
      logger.error(`[Stripe Webhook] Signature Validation failed: ${err.message}`);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    const typeHandlers = this.handlers.get(event.type) || [];
    const wildcardHandlers = this.handlers.get('*') || [];
    const allHandlers = [...typeHandlers, ...wildcardHandlers];

    if (allHandlers.length === 0) {
      logger?.debug?.(`[Stripe Webhook] No handlers registered for event type ${event.type}. Ignoring.`);
      return;
    }

    // Execute handlers in parallel
    await Promise.all(allHandlers.map(handler => handler(event).catch(err => {
      logger.error(`[Stripe Webhook] Error executing handler for ${event.type}: ${err.message}`);
      // Depending on strictness, we might throw here to return a 500 to Stripe and trigger a retry
      throw err;
    })));
  }
}
