# Datagrid Module (`node-yalc/datagrid`)

The Datagrid module provides standardized contracts and utilities for handling tabular data, pagination, sorting, and RESTful CRUD scaffolding within the Ferrox-Node framework.

## Overview

Modern Enterprise Admin Panels and Dashboards rely heavily on DataGrids (tables) to display information. The backend must provide a uniform API response format so the frontend can easily consume paginated, sortable, and searchable data.

## Standard Contracts

### `DataGridRequest`
When the frontend requests data for a table, it sends this payload (typically via Query Params or a POST body):
```json
{
  "page": 1,
  "pageSize": 50,
  "sortField": "createdAt",
  "sortOrder": "DESC",
  "searchQuery": "admin@example.com"
}
```

### `DataGridResponse<T>`
The backend always responds with this standardized format:
```json
{
  "data": [{ "id": 1, "email": "admin@example.com" }],
  "total": 142,
  "page": 1,
  "pageSize": 50,
  "totalPages": 3
}
```

## `FerroxDataGridEngine`

While it is highly recommended to perform pagination and sorting directly at the database level (using SQL `LIMIT`, `OFFSET`, `ORDER BY`), there are scenarios where data is retrieved from external APIs, Redis, or small in-memory caches.

The `FerroxDataGridEngine` provides an in-memory processor to apply a `DataGridRequest` to a raw JavaScript array and return a compliant `DataGridResponse`.

```typescript
import { FerroxDataGridEngine, DataGridRequest } from '@node-yalc/datagrid';

const rawData = [ ... ]; // Array of 1000 items
const request: DataGridRequest = { page: 2, pageSize: 10, sortField: 'name', sortOrder: 'ASC' };

const response = FerroxDataGridEngine.paginate(rawData, request);
// Automatically sorts by 'name', takes items 11-20, and calculates totalPages.
```

## `FerroxCrudGenerator`

To reduce boilerplate when building standard RESTful APIs, the `FerroxCrudGenerator` can scaffold basic CRUD endpoints automatically, assuming you have a repository that implements a standard interface.

```typescript
import { FerroxCrudGenerator } from '@node-yalc/datagrid';

const userRoutes = FerroxCrudGenerator.createCrudRoutes('User', userRepository);

// userRoutes now contains definitions for:
// GET /api/v1/users
// GET /api/v1/users/:id
// POST /api/v1/users
// DELETE /api/v1/users/:id
```
These route definitions can be iterated over and attached directly to Fastify or NestJS controllers.
