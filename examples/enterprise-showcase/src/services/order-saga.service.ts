import { Injectable } from '@ferrox-node/core';
import { AcidSagaCoordinator, SagaTransaction } from '@ferrox-node/cqrs';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('OrderSagaService');

export interface CheckoutOrderPayload {
  orderId: string;
  productId: string;
  quantity: number;
  customerId: string;
  totalCents: number;
  paymentMethod: string;
  simulatePaymentFailure?: boolean;
}

export interface CheckoutResult {
  orderId: string;
  status: 'FULFILLED' | 'REFUNDED' | 'FAILED';
  assignedWarehouse?: string;
  paymentTransactionId?: string;
  compensatedSteps?: string[];
  error?: string;
}

@Injectable()
export class OrderSagaService {
  // In-memory inventory state for multi-warehouse fallback demonstration
  private warehouseInventory: Record<string, Record<string, number>> = {
    'WH-ROME': { 'PROD-A': 0, 'PROD-B': 10 },    // Out of stock for PROD-A
    'WH-MILAN': { 'PROD-A': 15, 'PROD-B': 50 },  // Available fallback
    'WH-NAPLES': { 'PROD-A': 5, 'PROD-B': 20 }
  };

  private orders: Map<string, any> = new Map();

  async executeCheckoutSaga(payload: CheckoutOrderPayload): Promise<CheckoutResult> {
    const saga = new AcidSagaCoordinator();
    const tx: SagaTransaction = {
      id: payload.orderId,
      payload: { ...payload, state: {} }
    };

    // STEP 1: Multi-Warehouse Inventory Check & Allocation
    saga.addStep(
      'MultiWarehouseInventoryStep',
      async (transaction) => {
        const prod = transaction.payload.productId;
        const qty = transaction.payload.quantity;

        // Try Rome first, then fallback to Milan
        let allocatedWh: string | null = null;
        for (const [whId, stockMap] of Object.entries(this.warehouseInventory)) {
          if ((stockMap[prod] || 0) >= qty) {
            allocatedWh = whId;
            break;
          }
        }

        if (!allocatedWh) {
          throw new Error(`Inventory exhausted across all warehouses for product ${prod}`);
        }

        this.warehouseInventory[allocatedWh][prod] -= qty;
        transaction.payload.state.warehouseId = allocatedWh;
        logger.log(`[SAGA STEP 1] Allocated ${qty} units of ${prod} from ${allocatedWh}`);
        return { warehouseId: allocatedWh, quantity: qty };
      },
      async (transaction, result) => {
        if (result?.warehouseId) {
          this.warehouseInventory[result.warehouseId][transaction.payload.productId] += result.quantity;
          logger.warn(`[SAGA STEP 1 ROLLBACK] Restored ${result.quantity} units to ${result.warehouseId}`);
        }
      }
    );

    // STEP 2: Payment Authorization & Capture
    saga.addStep(
      'PaymentCaptureStep',
      async (transaction) => {
        if (transaction.payload.simulatePaymentFailure) {
          throw new Error('Payment gateway card decline simulation (HTTP 402)');
        }

        const txId = `PAY-TX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        transaction.payload.state.paymentTransactionId = txId;
        logger.log(`[SAGA STEP 2] Authorized and captured payment: ${txId} for ${transaction.payload.totalCents} cents`);
        return { paymentTransactionId: txId };
      },
      async (transaction, result) => {
        if (result?.paymentTransactionId) {
          logger.warn(`[SAGA STEP 2 ROLLBACK] Dispatched refund API call for payment: ${result.paymentTransactionId}`);
        }
      }
    );

    // STEP 3: Order Finalization & Confirmation
    saga.addStep(
      'OrderFinalizationStep',
      async (transaction) => {
        const orderRecord = {
          orderId: transaction.id,
          customerId: transaction.payload.customerId,
          productId: transaction.payload.productId,
          quantity: transaction.payload.quantity,
          warehouseId: transaction.payload.state.warehouseId,
          paymentTransactionId: transaction.payload.state.paymentTransactionId,
          status: 'FULFILLED',
          createdAt: new Date().toISOString()
        };

        this.orders.set(transaction.id, orderRecord);
        logger.log(`[SAGA STEP 3] Order ${transaction.id} persisted as FULFILLED`);
        return orderRecord;
      },
      async (transaction) => {
        const existing = this.orders.get(transaction.id);
        if (existing) {
          existing.status = 'CANCELLED';
          this.orders.set(transaction.id, existing);
          logger.warn(`[SAGA STEP 3 ROLLBACK] Order ${transaction.id} status updated to CANCELLED`);
        }
      }
    );

    try {
      await saga.execute(tx);
      return {
        orderId: payload.orderId,
        status: 'FULFILLED',
        assignedWarehouse: tx.payload.state.warehouseId,
        paymentTransactionId: tx.payload.state.paymentTransactionId
      };
    } catch (err: any) {
      logger.error(`[SAGA EXECUTION FAILED] ${err.message}`);
      return {
        orderId: payload.orderId,
        status: 'REFUNDED',
        error: err.message
      };
    }
  }

  getOrder(orderId: string) {
    return this.orders.get(orderId) || null;
  }

  getWarehouseStock() {
    return this.warehouseInventory;
  }
}
