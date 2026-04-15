# Bar Inventory System
Reactive monolith with Spring Boot WebFlux, JWT auth, PostgreSQL and Flyway.

## Run with Docker
1. `docker compose build --no-cache`
2. `docker compose up -d`
3. API base URL: `http://localhost:8082`
4. Swagger UI: `http://localhost:8082/swagger-ui.html`

Default login:
- user: `admin`
- password: `admin123`

## Main Endpoints
Auth:
- `POST /api/auth/login`

Masters:
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/PUT/DELETE /api/units`
- `GET/POST/PUT/DELETE /api/suppliers`
- `GET/POST/PUT/DELETE /api/products`
- `GET/POST/PUT/DELETE /api/locations`
- `GET/POST/PUT/DELETE /api/recipes`
- `GET /api/recipes/{id}/items`
- `POST /api/recipes/{id}/items`
- `DELETE /api/recipes/items/{itemId}`
- `GET/POST/PUT/DELETE /api/menu-items`

Inventory transactions:
- `GET /api/transactions`
- `GET /api/transactions/{id}`
- `GET /api/transactions/{id}/items`
- `POST /api/transactions` (header + items)
- `PATCH /api/transactions/{id}/status?value=POSTED`
- `GET /api/stock-balances`

Sales:
- `GET /api/sales`
- `GET /api/sales/{id}`
- `GET /api/sales/{id}/items`
- `POST /api/sales` (supports `processInventory=true`)
- `POST /api/sales/{id}/post-inventory?userId=1`

Physical counts:
- `GET /api/physical-counts`
- `GET /api/physical-counts/{id}`
- `GET /api/physical-counts/{id}/items`
- `POST /api/physical-counts`
- `POST /api/physical-counts/{id}/close?userId=1`

Reports:
- `GET /api/reports/stock`
- `GET /api/reports/movements`
- `GET /api/reports/waste`
- `GET /api/reports/consumption`
- `GET /api/reports/count-differences`
- `GET /api/reports/inventory-valuation`
- `GET /api/reports/audit`

## Notes
- SQL functions and triggers in `V1__init.sql` handle stock effects, sales posting and count closing.
- Backend service layer calls database functions:
  - `fn_post_sale_to_inventory`
  - `fn_close_physical_count`
