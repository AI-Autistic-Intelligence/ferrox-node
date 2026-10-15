import { Controller, Post, Get, Injectable } from '@ferrox-node/core';
import { OrderSagaService, CheckoutOrderPayload } from '../services/order-saga.service';
import { BadRequestError, NotFoundError } from '@node-yalc/errors';

@Controller('/api/v1/orders')
@Injectable()
export class OrdersController {
  constructor(private sagaService: OrderSagaService) {}

  @Post('/checkout')
  async checkout(req: { body?: Partial<CheckoutOrderPayload> }) {
    const body = req.body || {};

    if (!body.productId || !body.quantity) {
      throw new BadRequestError('productId and quantity are required for checkout.');
    }

    const payload: CheckoutOrderPayload = {
      orderId: body.orderId || `ORD-${Date.now()}`,
      productId: body.productId,
      quantity: body.quantity,
      customerId: body.customerId || 'CUST-DEMO',
      totalCents: body.totalCents || (body.quantity * 2500),
      paymentMethod: body.paymentMethod || 'CREDIT_CARD',
      simulatePaymentFailure: body.simulatePaymentFailure || false
    };

    const result = await this.sagaService.executeCheckoutSaga(payload);

    return {
      success: result.status === 'FULFILLED',
      data: result
    };
  }

  @Get('/warehouses')
  getWarehouseStock() {
    return {
      success: true,
      data: this.sagaService.getWarehouseStock()
    };
  }

  @Get('/:id')
  getOrder(req: { params?: { id?: string }; url?: string }) {
    // Extract ID from params or URL path
    const urlParts = (req.url || '').split('/');
    const orderId = req.params?.id || urlParts[urlParts.length - 1];

    const order = this.sagaService.getOrder(orderId);
    if (!order) {
      throw new NotFoundError(`Order with ID ${orderId} not found.`);
    }

    return {
      success: true,
      data: order
    };
  }
}
