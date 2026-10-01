---
id: onion
title: Strict Onion Architecture
sidebar_position: 1
---

# The 7-Layer Onion Architecture in Ferrox-Node

Ferrox-Node enforces a strict interpretation of the Onion Architecture to ensure that the core business logic remains entirely decoupled from infrastructure and transport layers.

## Why Onion Architecture?

In traditional Node.js applications, it is common to see SQL queries written directly inside Express controllers. This creates tight coupling: changing the database or the HTTP framework requires rewriting the entire application.

Ferrox-Node reverses this dependency flow.

## The Layers

1. **Domain Entities (Core)**: Pure TypeScript classes representing the business state. Zero dependencies on any external library.
2. **Use Cases / CQRS Commands**: The business logic. These orchestrate Domain Entities but rely on Interfaces (Ports) rather than concrete implementations.
3. **Application Services**: The layer that coordinates between Use Cases, triggering events and managing overarching transactions.
4. **Controllers & Transports (Edge)**: Fastify routes, Kafka consumers, and WebSockets. They solely translate incoming data into Commands.
5. **Infrastructure Adapters**: Concrete implementations of the Ports (e.g., TypeORM repositories, AWS S3 clients).

## The Golden Rule of Dependency Direction

**Dependencies must only point inward.**
A Controller can invoke a Use Case. A Use Case can NEVER invoke a Controller. An Infrastructure Adapter implements a Use Case interface, ensuring the Use Case remains ignorant of the underlying database technology.
