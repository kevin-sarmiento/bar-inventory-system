# Sistema de inventario de barras
Monolito reactivo con Spring Boot 3, WebFlux, JWT y PostgreSQL.

## Cómo levantar en local
1) `docker compose up -d` (levanta Postgres y la app en 8080).  
2) Credenciales iniciales: `admin / admin123` (se crean con Flyway).  
3) Salud: `GET http://localhost:8080/actuator/health`

## Endpoints principales
- `POST /api/auth/login` → body `{ "username": "admin", "password": "admin123" }` devuelve `token`.
- `GET /api/products` (Bearer token).
- `POST /api/products` crea producto.
- `PUT /api/products/{id}`, `DELETE /api/products/{id}`.
- `GET /api/categories`, `POST /api/categories`, `PUT /api/categories/{id}`, `DELETE /api/categories/{id}`.
- `GET /api/units`, `POST /api/units`, `PUT /api/units/{id}`, `DELETE /api/units/{id}`.
- `GET /api/suppliers`, `POST /api/suppliers`, `PUT /api/suppliers/{id}`, `DELETE /api/suppliers/{id}`.
- `GET /api/transactions`, `POST /api/transactions`.
- `GET /api/reports/stock?locationId=` stock actual (vista `vw_inventory_current`).
- `GET /api/reports/movements?from=YYYY-MM-DD&to=YYYY-MM-DD&type=SALE` movimientos (vista `vw_report_movements`).

## Estructura
- `src/main/java/com/bar/inventory` código de app.
- `src/main/resources/db/migration` migraciones Flyway (V1 esquema completo, V2 usuario admin).
- `documentos` requisitos.xlsx, script SQL, colección Postman, tabla de requisitos (MD) y flujo de proceso.

## Build sin Docker
```
mvn clean package -DskipTests
java -jar target/bar-inventory-system-0.1.0.jar
```
