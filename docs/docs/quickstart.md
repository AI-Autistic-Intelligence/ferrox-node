---
id: quickstart
title: Quickstart Guide & Service Bootstrap
sidebar_position: 2
---

# Quickstart Guide & Service Bootstrap

This step-by-step guide demonstrates how to install `@ferrox/node` and bootstrap a resilient microservice with authentication guards, dynamic configuration validation, singleflight request deduplication, and OpenTelemetry tracing.

---

## 1. Installation

Install `@ferrox/node` using your preferred package manager:

```bash
npm install @ferrox/node
```

Ensure peer dependencies are installed:

```bash
npm install fastify pino zod typeorm postgresql
```

---

## 2. Step 1: Define Configuration Schema

Create a validated configuration schema (`src/config.ts`):

```typescript
import { z } from 'zod';
import { ConfigEngine } from '@ferrox/node';

export const ServiceConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  SERVICE_NAME: z.string().default('order-microservice'),
  JWT_SECRET: z.string().min(16),
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export const config = ConfigEngine.load({ schema: ServiceConfigSchema });
```

---

## 3. Step 2: Implement Singleflight Service Layer

Create `src/order.service.ts` featuring Singleflight request deduplication:

```typescript
import { SingleflightGroup } from '@ferrox/node';

export interface Order {
  id: string;
  amount: number;
  status: string;
}

export class OrderService {
  private sfGroup = new SingleflightGroup();

  async getOrderById(orderId: string): Promise<Order> {
    // Deduplicates simultaneous requests for the same order ID
    return await this.sfGroup.do(`order_${orderId}`, async () => {
      console.log(`Reading order ${orderId} from primary database...`);

      // Simulated DB read
      return {
        id: orderId,
        amount: 299.99,
        status: 'PAID',
      };
    });
  }
}
```

---

## 4. Step 3: Create Controller with Guards

Create `src/order.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards, Roles } from '@ferrox/node';
import { AuthGuard, RolesGuard } from '@ferrox/node/guards';
import { OrderService } from './order.service';

@Controller('/api/v1/orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('/:id')
  @Roles('USER', 'ADMIN')
  async getOrder(@Param('id') id: string) {
    const order = await this.orderService.getOrderById(id);
    return { success: true, data: order };
  }
}
```

---

## 5. Step 4: Bootstrap Ferrox Application Kernel

Bootstrap your microservice in `src/main.ts`:

```typescript
import { FerroxKernel } from '@ferrox/node';
import { config } from './config';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

async function bootstrap() {
  const orderService = new OrderService();
  const orderController = new OrderController(orderService);

  const kernel = new FerroxKernel({
    serviceName: config.SERVICE_NAME,
    port: config.PORT,
    controllers: [orderController],
    tracing: {
      enabled: true,
      samplingRatio: 1.0,
    },
    cors: {
      origin: '*',
    },
  });

  await kernel.listen();
  console.log(`Ferrox Service running on http://localhost:${config.PORT}`);
}

bootstrap();
```

---

## 6. Verification

Run your service entry script:

```bash
npx ts-node src/main.ts
```

Send a test request with authorization header:

```bash
curl -X GET http://localhost:4000/api/v1/orders/ord_999 \
  -H "Authorization: Bearer <valid_jwt_token>"
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "ord_999",
    "amount": 299.99,
    "status": "PAID"
  }
}
```

---

## 7. Next Steps

- Explore [Resilience Patterns](components/resilience.md) to set up Circuit Breakers.
- Read about [Distributed Tracing](components/tracing.md) for OpenTelemetry integration.
