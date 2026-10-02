import Stripe from 'stripe';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('StripeWebhookRouter');

/**
 * Type alias for an asynchronous Stripe Webhook Event handler.
 */
type StripeWebhookHandler = (event: Stripe.Event) => Promise<void>;

/**
 * Enterprise Stripe Webhook Router.
 * 
 * Securely intercepts, validates, and routes Stripe Webhook events.
 * It enforces payload signature verification to prevent spoofing attacks 
 * and allows registering multiple handlers for specific Stripe events (e.g., `invoice.paid`).
 */
export class StripeWebhookRouter {
  private client: Stripe;
  private webhookSecret: string;
  private handlers = new Map<string, StripeWebhookHandler[]>();

  /**
   * Initializes the Stripe Webhook Router.
   * 
   * @param secretKey The secret Stripe API key (starts with 'sk_').
   * @param webhookSecret The Stripe Webhook Endpoint Secret (starts with 'whsec_') used for signature validation.
   */
  constructor(secretKey: string, webhookSecret: string) {
    this.client = new Stripe(secretKey, { apiVersion: '2024-04-10' });
    this.webhookSecret = webhookSecret;
    logger.log('Stripe Webhook Router initialized');
  }

  /**
   * Registers a handler for a specific Stripe Event type.
   * Multiple handlers can be registered for the same event type.
   * 
   * @param {Stripe.Event.Type | '*'} eventType The specific Stripe event to listen for, or '*' for all events.
   * @param {StripeWebhookHandler} handler The asynchronous function to execute when the event occurs.
   */
  public on(eventType: Stripe.Event.Type | '*', handler: StripeWebhookHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Validates the cryptographic signature of the incoming webhook and dispatches the 
   * raw payload to all registered handlers for that event type in parallel.
   * 
   * @param {string | Buffer} rawBody The raw, unparsed request body from Stripe.
   * @param {string} signature The `Stripe-Signature` header value.
   * @returns {Promise<void>} Resolves when all handlers have completed execution.
   * @throws {Error} If signature validation fails or an unhandled error occurs in a handler.
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
