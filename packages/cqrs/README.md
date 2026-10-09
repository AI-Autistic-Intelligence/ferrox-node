<div align="center">
  <h1>@ferrox-node/cqrs</h1>
  <p><em>Core enterprise module for the @ferrox-node/cqrs integration within the Ferrox/YALC ecosystem.</em></p>
  
  [![npm version](https://badge.fury.io/js/%40ferrox-node%2Fcqrs.svg)](https://badge.fury.io/js/%40ferrox-node%2Fcqrs)
  [![License](https://img.shields.io/npm/l/%40ferrox-node%2Fcqrs.svg)](https://github.com/AI-Autistic-Intelligence)
</div>

## 🚀 Installation

```bash
npm install @ferrox-node/cqrs
# or
yarn add @ferrox-node/cqrs
# or
pnpm add @ferrox-node/cqrs
```

---

# 📡 CQRS & Event Sourcing (`@ferrox-node/cqrs`)

## 💡 1. What It Is & Architectural Purpose
CQRS (Command Query Responsibility Segregation) is an architectural pattern that separates read operations (Queries) from write operations (Commands). The `@ferrox-node/cqrs` module provides a native, highly-optimized message bus to implement this pattern. Its architectural purpose is to allow independent scaling, caching, and optimization of the Read and Write models in highly complex domains.

---

## ⚙️ 2. Comprehensive Taxonomy & Key Features

| Component | Description | Use Case |
| :--- | :--- | :--- |
| **`CommandBus`** | Dispatches Commands to exactly one Handler. | Creating a user, processing a payment. |
| **`QueryBus`** | Dispatches Queries to exactly one Handler. | Fetching paginated user lists. |
| **`EventBus`** | Publishes Domain Events to many Listeners. | Notifying systems that a user was created. |
| **`SagaManager`** | Orchestrates complex multi-step transactions. | Microservice distributed transactions. |

---

## 🔬 3. How It Works Under the Hood

```mermaid
flowchart LR
    Client[HTTP Client]
    Controller[API Controller]
    CommandBus[Command Bus]
    CommandHandler[CommandHandler]
    WriteDB[(Write DB)]
    EventBus[Event Bus]
    EventHandler[Event Handler (Projector)]
    ReadDB[(Read DB / Redis)]

    Client -->|POST /users| Controller
    Controller -->|execute(CreateUserCommand)| CommandBus
    CommandBus --> CommandHandler
    CommandHandler -->|INSERT| WriteDB
    CommandHandler -->|publish(UserCreatedEvent)| EventBus
    EventBus --> EventHandler
    EventHandler -->|UPDATE| ReadDB
```

Commands mutate state in a highly normalized relational database. The resulting Domain Events trigger projectors that pre-calculate and store materialized views in a fast, denormalized read database (like Redis or MongoDB).

---

## 🧠 4. Why It Was Designed This Way (Rationale)

In a traditional CRUD system, the same database schema is used for both writes and reads. As the system scales, complex SQL JOINs for dashboards become the bottleneck. CQRS solves this by decoupling the models. `@ferrox-node/cqrs` provides the routing infrastructure entirely in-memory using RxJS, achieving sub-millisecond dispatch times compared to generic pub/sub systems.

---

## 🚀 5. Usage Guide & Code Examples

### Defining a Command and Handler

```typescript
import { CommandHandler, ICommandHandler, EventPublisher } from '@ferrox-node/cqrs';

// 1. Define the Command
export class TransferFundsCommand {
  constructor(public readonly fromAcc: string, public readonly amount: number) {}
}

// 2. Define the Handler
@CommandHandler(TransferFundsCommand)
export class TransferFundsHandler implements ICommandHandler<TransferFundsCommand> {
  constructor(private publisher: EventPublisher) {}

  async execute(command: TransferFundsCommand) {
    console.log(`Transferring ${command.amount} from ${command.fromAcc}...`);
    
    // Mutate state...
    
    // Trigger Domain Event
    const event = new FundsTransferredEvent(command.fromAcc, command.amount);
    this.publisher.mergeObjectContext(event).commit();
  }
}
```

---

## ⚠️ 6. Anti-Patterns: How NOT to Use It

> [!WARNING]
> **Anti-Pattern 1: Commands Returning Data**
> A Command should return `void` or a simple ID. Do not return rich domain objects or query results from a Command Handler. If you need data, issue a Query after the Command.

> [!CAUTION]
> **Anti-Pattern 2: Overusing CQRS**
> Do not use CQRS for simple CRUD applications. The boilerplate outweighs the benefits. Use it only for bounded contexts with complex business rules or extreme scalability needs.

---

## 开启 7. Pro-Tips & Best Practices

> [!TIP]
> **Pro-Tip: Eventual Consistency**
> Embrace Eventual Consistency. Your Read Model might be a few milliseconds behind your Write Model. Design your UI to anticipate this (e.g., using optimistic UI updates) rather than forcing synchronous projections.


---
## 📚 Ecosystem Documentation

This module is a core component of the Ferrox enterprise microservice architecture. 

👉 **[Read the Full Documentation on Ferrox-Rust.dev](https://ferrox-rust.dev/docs/ferrox-node/architectures/cqrs)**
