# Common Module (`node-yalc/common`)

The Common module provides the foundational interfaces and types for the Ferrox-Node Framework. These interfaces mirror standard inversion-of-control (IoC) and dependency injection patterns, ensuring the entire framework operates on a unified, consistent standard without being tightly coupled to a single vendor implementation.

## Overview

Ferrox relies heavily on decorators and metadata for its architecture. To ensure strong typing and predictable behavior across request lifecycles, the `node-yalc/common` module exports strict interfaces that developer implementations must follow.

## Dependency Injection Markers

These interfaces (`IController`, `IResolver`, `IService`, `IProvider`) are marker interfaces used primarily for typing and logical grouping within the framework's Dependency Injection system.
* **`IController`**: Marks classes that handle incoming HTTP requests (RESTful endpoints).
* **`IResolver`**: Marks classes that handle GraphQL queries and mutations.
* **`IService`**: Marks business-logic layer classes meant for internal consumption.
* **`IProvider`**: Generic marker for utility or factory providers.

## Request Lifecycle Interfaces

The core of Ferrox-Node's request pipeline operates using standard interceptor patterns. By implementing these interfaces, developers can hook into the request/response lifecycle securely.

*   **`IExecutionContext`**: The context object passed to guards and interceptors, providing access to the current request, response, and active controller handler.
*   **`IGuard`**: Used for authorization. The `canActivate` method determines if a request is permitted to proceed to the controller.
*   **`IInterceptor`**: Used for Aspect-Oriented Programming (AOP). Allows modifying the incoming request or transforming the outgoing response (e.g. logging, caching, mapping).
*   **`IPipeTransform`**: Used for input data validation and transformation before the payload reaches the controller method (e.g. converting a string `id` to an integer).
*   **`IExceptionFilter`**: Global or scoped error handlers that catch unhandled exceptions during execution and format a secure, standardized response to the client.

## Usage Note

When creating custom Guards, Pipes, or Interceptors in your application, always implement the interfaces from this package to ensure full compatibility with the internal execution engine.
