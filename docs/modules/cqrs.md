# CQRS Module (`node-yalc/cqrs`)

The CQRS module implements the Command Query Responsibility Segregation (CQRS) architectural pattern alongside Distributed Sagas for the Ferrox-Node framework. It provides the building blocks for creating highly scalable, decoupled microservices.

## Overview

By strictly separating operations that read data (Queries) from operations that mutate data (Commands), this module helps developers maximize performance, scalability, and security.

### CqrsEngine

The `CqrsEngine` acts as an in-memory message bus. It routes incoming Commands and Queries to their specific handlers.

```typescript
import { CqrsEngine } from '@node-yalc/cqrs';

const engine = new CqrsEngine();

// Register Handlers
engine.registerCommandHandler('CREATE_USER', async (cmd) => {
  console.log('Creating user:', cmd.payload);
  return { id: 1 };
});

engine.registerQueryHandler('GET_USER', async (query) => {
  return { id: query.params.id, name: 'John Doe' };
});

// Dispatch Commands/Queries
const user = await engine.executeCommand({ type: 'CREATE_USER', payload: { name: 'John' } });
const userData = await engine.executeQuery({ type: 'GET_USER', params: { id: 1 } });
```

## Saga Orchestrator

In distributed microservice architectures, traditional ACID transactions across multiple databases are impossible. The `SagaOrchestrator` implements the Saga pattern to manage distributed transactions.

A Saga consists of multiple distinct steps. If one step fails, the Orchestrator automatically triggers the **compensation** (rollback) actions for all previously succeeded steps, in reverse order.

### Usage Example

```typescript
import { SagaOrchestrator } from '@node-yalc/cqrs';

const saga = new SagaOrchestrator();

saga.addStep({
  name: 'Create Order',
  action: async () => await orderDB.create(),
  compensation: async () => await orderDB.delete(),
});

saga.addStep({
  name: 'Charge Credit Card',
  action: async () => await paymentGateway.charge(),
  compensation: async () => await paymentGateway.refund(), // Rollback order if charge succeeds but next step fails
});

saga.addStep({
  name: 'Allocate Inventory',
  action: async () => { throw new Error('Out of stock!'); }, // Simulating a failure
  compensation: async () => await inventoryDB.deallocate(),
});

const result = await saga.execute();

if (!result.success) {
  console.error('Transaction Failed. Rollbacks executed.', result.error);
}
```

## Next Steps
Use the `CqrsEngine` as a global provider so that controllers can dispatch commands seamlessly without knowing which services implement the business logic.
