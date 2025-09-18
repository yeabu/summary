Backend Service (Go)

Overview
- This directory contains the main Go backend for the Summary system.
- Exposes RESTful JSON APIs with JWT Bearer authentication.
- Uses GORM + MySQL for persistence.

Key Areas
- db: DB initialization and migrations (auto-migrate on startup for key models).
- handlers: Route handlers (auth, users, bases, expenses, purchases, payables, products, supplier, product purchase parameters, etc.).
- models: GORM models for all entities (users, bases, base sections, expenses, purchases, payables, links, products, specs, purchase params, etc.).
- routes: HTTP router wiring all endpoints with middleware.
- middleware: JWT parsing and role authorization.

Run
- Env: set `MYSQL_DSN` and `JWT_SECRET`.
- From project root: `cd backend && go run main.go`
- The server will auto-migrate required tables and start the HTTP service.

Auth
- Login: `POST /api/login` returns `{ token, role, user_id, bases }`.
- Authenticated routes require header `Authorization: Bearer <token>`.

Notable Endpoints (selected)
- Users: list/get/create/update/delete, batch-delete, reset password.
- Bases: list/get/create/update/delete, batch-delete; sections CRUD.
- Expenses: create/list/update/delete, stats; batch-create supported at `/api/expense/batch-create` (accepts `{ base_id?, items: [...] }`).
- Purchases: create/list/update/delete, batch-delete; deletion detaches related payables safely.
- Payables: list/summary/detail/overdue and payments.
- Products: CRUD + unit specs + purchase parameters.
  - Purchase parameters: `GET/POST /api/product/purchase-param` (+ upsert at `/upsert`).

Conventions
- Admin can manage global resources; base_agent is scoped to own base(s).
- Deletions are transactional and clear dependent rows first to satisfy foreign keys.

Notes
- This README is intentionally minimal to keep the backend folder tidy. See project root docs for business details.

