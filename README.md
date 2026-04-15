# Bar Inventory System

Backend reactivo para inventario de bar construido con Spring Boot WebFlux, JWT, PostgreSQL y Flyway.

## Tecnologías
- Java 17
- Spring Boot 3
- Spring WebFlux
- Spring Security con JWT
- PostgreSQL
- Flyway
- Docker Compose

## Cómo correr el proyecto
### Opción 1: Docker
```powershell
docker compose up -d --build
```

Queda disponible en:
- API: `http://localhost:8082`
- Swagger UI: `http://localhost:8082/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8082/v3/api-docs`

Login por defecto:
- usuario: `admin`
- contraseña: `admin123`

### Opción 2: local con Java
Necesitas:
- Java 17
- Maven
- PostgreSQL

Luego:
```powershell
mvn spring-boot:run
```

## Autenticación
La API usa JWT. Primero debes hacer login y luego enviar el token en el header:

```http
Authorization: Bearer TU_TOKEN
```

### Login
`POST /api/auth/login`

Sirve para autenticar un usuario y obtener el token JWT.

Ejemplo:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

## Roles principales
- `ADMINISTRADOR`: acceso total y administración de usuarios
- `GERENTE`: gestión operativa y turnos
- `INVENTARIO`: catálogos, recetas, inventario y reportes operativos
- `CAJERO`: ventas y consulta de sus turnos
- `BARTENDER`: consulta de sus turnos y operación limitada según reglas

## Módulos y endpoints

### 1. Usuarios
Permiten al administrador crear usuarios, activarlos, asignarles roles y resetear contraseñas.

- `GET /api/users`
  Lista todos los usuarios.
- `GET /api/users/{id}`
  Devuelve un usuario específico.
- `POST /api/users`
  Crea un nuevo usuario con contraseña inicial y roles.
- `PATCH /api/users/{id}/active?value=true|false`
  Activa o desactiva un usuario.
- `PUT /api/users/{id}/roles`
  Reemplaza los roles del usuario.
- `PUT /api/users/{id}/password`
  Resetea la contraseña temporal del usuario.
- `GET /api/users/roles/catalog`
  Lista el catálogo de roles disponibles.

### 2. Categorías
Sirven para clasificar productos.

- `GET /api/categories`
  Lista categorías.
- `GET /api/categories/{id}`
  Consulta una categoría.
- `POST /api/categories`
  Crea una categoría.
- `PUT /api/categories/{id}`
  Actualiza una categoría.
- `DELETE /api/categories/{id}`
  Elimina una categoría.

### 3. Unidades de medida
Definen cómo se mide cada producto: mililitros, litros, unidades, etc.

- `GET /api/units`
- `GET /api/units/{id}`
- `POST /api/units`
- `PUT /api/units/{id}`
- `DELETE /api/units/{id}`

### 4. Proveedores
Se usan para compras y devoluciones a proveedor.

- `GET /api/suppliers`
- `GET /api/suppliers/{id}`
- `POST /api/suppliers`
- `PUT /api/suppliers/{id}`
- `DELETE /api/suppliers/{id}`

### 5. Ubicaciones
Representan lugares físicos como bodega, bar, cocina o nevera.

- `GET /api/locations`
- `GET /api/locations/{id}`
- `POST /api/locations`
- `PUT /api/locations/{id}`
- `DELETE /api/locations/{id}`

Nota:
- `locationType` debe usar valores válidos del modelo de base de datos, por ejemplo: `WAREHOUSE`, `BAR`, `KITCHEN`, `FRIDGE`, `AUXILIARY`.

### 6. Productos
Son los insumos físicos que se compran, almacenan y consumen.

- `GET /api/products`
  Lista productos.
- `GET /api/products/{id}`
  Consulta un producto.
- `POST /api/products`
  Crea un producto.
- `PUT /api/products/{id}`
  Actualiza un producto.
- `DELETE /api/products/{id}`
  Elimina un producto.

Campos importantes:
- `categoryId`
- `baseUnitId`
- `minStockBaseQty`
- `active`

### 7. Recetas
Definen cómo se compone un cóctel o preparación.

- `GET /api/recipes`
- `GET /api/recipes/{id}`
- `POST /api/recipes`
- `PUT /api/recipes/{id}`
- `DELETE /api/recipes/{id}`
- `GET /api/recipes/{id}/items`
  Lista los ingredientes de la receta.
- `POST /api/recipes/{id}/items`
  Agrega un ingrediente a la receta.
- `DELETE /api/recipes/items/{itemId}`
  Elimina un ingrediente de receta.

### 8. Menú
Representa productos vendibles al cliente final.

- `GET /api/menu-items`
- `GET /api/menu-items/{id}`
- `POST /api/menu-items`
- `PUT /api/menu-items/{id}`
- `DELETE /api/menu-items/{id}`

Uso:
- un `menu-item` referencia una `recipe`
- su `salePrice` es el precio de venta

### 9. Turnos
Permiten programar y operar turnos de los trabajadores.

- `GET /api/shifts`
  Lista todos los turnos. Solo `ADMINISTRADOR` y `GERENTE`.
- `GET /api/shifts/{id}`
  Consulta un turno. El dueño del turno también puede verlo.
- `GET /api/shifts/me`
  Lista los turnos del usuario autenticado.
- `POST /api/shifts`
  Crea un turno.
- `PUT /api/shifts/{id}`
  Actualiza un turno programado.
- `PATCH /api/shifts/{id}/cancel`
  Cancela un turno.
- `POST /api/shifts/{id}/check-in`
  Marca entrada al turno.
- `POST /api/shifts/{id}/check-out`
  Marca salida del turno.

Reglas importantes:
- no se permiten turnos solapados para el mismo usuario
- solo se pueden editar turnos `SCHEDULED`
- no se puede cancelar un turno en progreso o completado

### 10. Transacciones de inventario
Controlan entradas, salidas, ajustes y transferencias.

- `GET /api/transactions`
  Lista transacciones.
- `GET /api/transactions/{id}`
  Consulta una transacción.
- `GET /api/transactions/{id}/items`
  Lista los items de la transacción.
- `POST /api/transactions`
  Crea una transacción con encabezado e items.
- `PATCH /api/transactions/{id}/status?value=POSTED|CANCELLED`
  Cambia el estado de una transacción.

Tipos soportados:
- `OPENING_STOCK`
- `PURCHASE`
- `SALE`
- `CONSUMPTION`
- `WASTE`
- `ADJUSTMENT_IN`
- `ADJUSTMENT_OUT`
- `TRANSFER`
- `RETURN_TO_SUPPLIER`
- `RETURN_FROM_CUSTOMER`

Reglas de negocio:
- no se permiten productos duplicados en una misma transacción
- `TRANSFER` requiere origen y destino distintos
- ciertas transacciones usan solo origen o solo destino según el tipo
- estados válidos: `DRAFT`, `POSTED`, `CANCELLED`

### 11. Saldos de stock
Sirven para consultar el inventario actual consolidado.

- `GET /api/stock-balances`
  Lista saldos de stock.
- `GET /api/stock-balances/{id}`
  Consulta un saldo puntual.

### 12. Ventas
Registran ventas y opcionalmente postean la salida a inventario.

- `GET /api/sales`
  Lista ventas.
- `GET /api/sales/{id}`
  Consulta una venta.
- `GET /api/sales/{id}/items`
  Lista los items de la venta.
- `POST /api/sales`
  Crea una venta.
- `POST /api/sales/{id}/post-inventory?userId=1`
  Ejecuta la salida de inventario de una venta pagada.

Reglas de negocio:
- `totalAmount` debe coincidir con la suma de los items
- cada item debe tener `menuItemId` o `productId`, pero no ambos
- no se permiten items duplicados
- si la venta tiene `shiftId`, el turno debe pertenecer al cajero y a la sede
- solo ventas `PAID` se pueden postear a inventario

### 13. Conteos físicos
Se usan para conteos de inventario y ajustes por diferencia.

- `GET /api/physical-counts`
- `GET /api/physical-counts/{id}`
- `GET /api/physical-counts/{id}/items`
- `POST /api/physical-counts`
- `POST /api/physical-counts/{id}/close?userId=1`

Reglas de negocio:
- no se permiten productos duplicados en un mismo conteo
- solo se puede cerrar un conteo en estado `DRAFT`

### 14. Reportes JSON
Todos estos endpoints devuelven información para consulta o dashboard.

- `GET /api/reports/stock`
  Inventario actual.
- `GET /api/reports/dashboard/daily`
  Resumen diario con ventas, inventario, turnos y topes.
- `GET /api/reports/movements`
  Movimientos de inventario.
- `GET /api/reports/waste`
  Reporte de mermas.
- `GET /api/reports/consumption`
  Reporte de consumo.
- `GET /api/reports/count-differences`
  Diferencias de conteos físicos.
- `GET /api/reports/inventory-valuation`
  Valorización del inventario.
- `GET /api/reports/audit`
  Historial de auditoría.
- `GET /api/reports/shifts`
  Resumen de turnos con ventas ligadas.
- `GET /api/reports/shifts/by-user`
  Agregado de turnos y ventas por usuario.
- `GET /api/reports/shifts/by-location`
  Agregado de turnos y ventas por sede.

Filtros comunes:
- `from`
- `to`
- `locationId`
- `userId`
- `physicalCountId`
- `date`

### 15. Exportaciones CSV y Excel
Las exportaciones están listas para abrirse en Excel.

CSV:
- `GET /api/reports/shifts/export`
- `GET /api/reports/shifts/by-user/export`
- `GET /api/reports/shifts/by-location/export`

Excel `.xlsx`:
- `GET /api/reports/stock/export.xlsx`
- `GET /api/reports/movements/export.xlsx`
- `GET /api/reports/waste/export.xlsx`
- `GET /api/reports/consumption/export.xlsx`
- `GET /api/reports/count-differences/export.xlsx`
- `GET /api/reports/inventory-valuation/export.xlsx`
- `GET /api/reports/audit/export.xlsx`
- `GET /api/reports/shifts/export.xlsx`
- `GET /api/reports/shifts/by-user/export.xlsx`
- `GET /api/reports/shifts/by-location/export.xlsx`

## Ejemplos rápidos
### Crear una venta
```json
{
  "saleNumber": "SALE-001",
  "saleDatetime": "2026-04-15T19:00:00Z",
  "locationId": 1,
  "cashierUserId": 2,
  "shiftId": 4,
  "totalAmount": 30,
  "status": "PAID",
  "processInventory": false,
  "items": [
    {
      "menuItemId": 1,
      "quantity": 1,
      "unitPrice": 30
    }
  ]
}
```

### Crear una transacción de compra
```json
{
  "transactionNumber": "TX-001",
  "transactionType": "PURCHASE",
  "transactionDate": "2026-04-15T18:00:00Z",
  "targetLocationId": 1,
  "supplierId": 1,
  "status": "DRAFT",
  "createdBy": 1,
  "items": [
    {
      "productId": 1,
      "unitId": 1,
      "quantity": 10,
      "unitCost": 5
    }
  ]
}
```

### Crear un turno
```json
{
  "userId": 2,
  "locationId": 1,
  "roleName": "CAJERO",
  "scheduledStart": "2026-04-15T14:00:00Z",
  "scheduledEnd": "2026-04-15T22:00:00Z",
  "notes": "Turno tarde"
}
```

## Validación realizada
La API fue sometida a una prueba integral de humo con operaciones reales:
- login
- CRUD principales
- turnos
- ventas
- inventario
- conteos
- reportes
- exportaciones

Resultado de la pasada de verificación:
- `113` checks correctos
- `0` fallos

Script usado:
- `scripts/smoke-all-endpoints.ps1`

## Notas internas
- Flyway crea la estructura y funciones de base de datos.
- Las funciones SQL de negocio principales incluyen:
  - `fn_post_sale_to_inventory`
  - `fn_close_physical_count`
- Swagger es la forma más simple de explorar y probar la API.
