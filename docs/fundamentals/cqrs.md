---
id: cqrs
title: CQRS & Event Sourcing
sidebar_position: 1
---

# Command Query Responsibility Segregation (CQRS)

Ferrox-Node strongly encourages the use of CQRS for complex microservices. This pattern separates the read model (Queries) from the write model (Commands).

## The Command Bus

When a client wants to mutate state (e.g., create an order, update a profile), the Controller must not execute the logic. Instead, it instantiates a `Command` object and dispatches it to the `CommandBus`.

```typescript
import { Controller, Post } from '@ferrox/node';

@Controller('/api/v1/orders')
export class OrderController {
    constructor(private commandBus: CommandBus) {}

    @Post('/')
    async createOrder(req: Request) {
        const command = new CreateOrderCommand(req.body);
        // The CommandBus automatically handles tracing and error formatting
        return await this.commandBus.execute(command);
    }
}
```

The Command Bus finds the appropriate Handler, wrapping the execution in observability traces and resilience patterns automatically.

## The Query Bus

For reading data, the Controller dispatches a `Query` object to the `QueryBus`. Queries are heavily optimized for read performance and often utilize Read Replicas, Datagrid projections, or Distributed Caching (Redis).

## Event Sourcing & The Outbox Pattern

When a Command successfully mutates state, it often emits a Domain Event. Ferrox-Node supports the **Outbox Pattern**: events are saved to the database in the same transaction as the state mutation. A background worker then publishes these events to Kafka or RabbitMQ, ensuring zero message loss even if the message broker is temporarily down during the transaction.
