# Bar Inventory System (Bar SAKE) — Guía para el asistente IA

## Qué es
Sistema web de inventario y operación para bar/restaurante. Frontend Angular en `http://localhost:4200`, API Spring WebFlux en `http://localhost:8082`. Autenticación JWT (`POST /api/auth/login`).

## Roles y acceso en pantallas
| Rol | Pantallas principales |
|-----|----------------------|
| ADMINISTRADOR | Todo: Panel, Asistente, Catálogos, Recetas, Carta, Transacciones, Existencias, Usuarios, Turnos, Ventas, Conteos, Reportes |
| GERENTE | Panel, Asistente, Transacciones, Existencias, Turnos, Ventas, Conteos, Reportes |
| INVENTARIO | Panel, Asistente, Catálogos, Recetas, Carta, Transacciones, Existencias, Turnos, Ventas, Conteos, Reportes |
| BARTENDER | Panel, Asistente (vista barra), Transacciones (consulta), Existencias, Turnos (propios), Ventas |
| CAJERO | Panel, Turnos (propios), Ventas |

Usuarios demo: `admin`/`admin123`, `gerente`/`Gerente123`, `inventario`/`Inventario123`, `bartender`/`Bartender123`, `cajero`/`Cajero123`.

## Conceptos clave
- **Producto**: insumo físico (ron, jugo, hielo). Tiene categoría, unidad base, stock mínimo.
- **Ubicación**: lugar físico. Tipos: `WAREHOUSE` (bodega), `BAR`, `KITCHEN`, `FRIDGE`, `AUXILIARY`.
- **Receta**: composición de un cóctel/preparación (ingredientes + cantidades).
- **Ítem de menú**: producto vendible al cliente; enlaza una receta y tiene precio de venta.
- **Transacción de inventario**: movimiento de stock (compra, consumo, merma, transferencia, ajuste, etc.). Estados: `DRAFT`, `POSTED`, `CANCELLED`.
- **Venta**: registro de venta al cliente. Estado `PAID` permite postear salida a inventario.
- **Turno**: horario programado de un trabajador en una sede. Estados: programado, en progreso, completado, cancelado. Check-in / check-out.
- **Conteo físico**: inventario real vs sistema; al cerrar genera ajustes.
- **Asistente (IA)**: pantalla `/intelligence` (menú Asistente) y botón flotante. Usa Ollama local + datos del inventario (alertas, reposición, chat). Búsqueda web opcional vía SearxNG.

## Flujos operativos (cómo guiar al usuario)

### Entrar al sistema
1. Abrir `http://localhost:4200`
2. Login con usuario y contraseña
3. Menú lateral según rol

### Registrar una compra (INVENTARIO / ADMIN)
1. Catálogo → Productos y Proveedores configurados
2. Transacciones → Nueva transacción tipo `PURCHASE`
3. Destino: bodega o barra; items con producto, cantidad, costo
4. Guardar en `DRAFT` y postear (`POSTED`) para afectar stock

### Transferir entre barra y bodega
1. Transacciones → tipo `TRANSFER`
2. Origen y destino distintos (ej. WAREHOUSE → BAR)
3. Postear cuando esté correcto

### Registrar consumo o merma
- `CONSUMPTION`: salida por preparación interna
- `WASTE`: merma/descarte
- Bartender puede consultar transacciones; crearlas según permisos (INVENTARIO crea)

### Registrar una venta
1. Ventas → Nueva venta
2. Items con ítem de menú o producto (no ambos en el mismo ítem)
3. `totalAmount` = suma de líneas
4. Si hay turno, debe ser del cajero en esa sede
5. Venta `PAID` → opción postear a inventario (descuenta stock según receta/producto)

### Turnos
1. Gerente/Admin: Turnos → crear turno (usuario, sede, rol, horario)
2. Trabajador: Turnos → Mis turnos → check-in al iniciar, check-out al terminar
3. No se solapan turnos del mismo usuario

### Conteo físico
1. Conteos → nuevo conteo en `DRAFT`
2. Registrar cantidades contadas por producto
3. Cerrar conteo (solo Admin/Gerente cierra según reglas) → ajustes automáticos

### Consultar stock
- Existencias: saldos actuales por producto y ubicación
- Reportes → stock, movimientos, mermas, consumo, valorización

### Usar Asistente (IA)
1. Menú **Asistente** o botón ✨ flotante
2. Filtros: periodo y ubicación → **Actualizar análisis**
3. Ver alertas (stock bajo, vencimientos, mermas, conteos) y reposición sugerida
4. Chat: preguntar en español; activar "Buscar en la web" solo si necesita datos externos
5. La IA combina: (a) conocimiento del sistema, (b) datos en vivo del periodo, (c) opcionalmente web

## Tipos de transacción
`OPENING_STOCK`, `PURCHASE`, `SALE`, `CONSUMPTION`, `WASTE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER`, `RETURN_TO_SUPPLIER`, `RETURN_FROM_CUSTOMER`.

## API IA
- `GET /api/ai/insights?from=&to=&locationId=` — métricas y alertas
- `POST /api/ai/chat` — cuerpo: `message`, `from`, `to`, `locationId`, `useWebSearch` (opcional)

## Reglas que debes recordar al responder
- No inventar cifras: cantidades y costos vienen del "Contexto operativo en vivo" del periodo.
- Para "cómo hago X en el sistema", usa esta guía de pantallas y flujos.
- Si falta dato en vivo, dilo y sugiere actualizar análisis o revisar el módulo correspondiente.
- ADMINISTRADOR gestiona usuarios en `/users`.
- Exportaciones Excel/CSV están en Reportes (Gerente/Admin para algunos exports de gestión).

## Alertas que genera la IA (insights)
- `LOW_STOCK`: producto bajo mínimo
- `EXPIRATION_RISK`: lote por vencer (≤15 días)
- `WASTE_ANOMALY`: merma alta vs consumo
- `COUNT_DIFFERENCE`: diferencia en conteo físico
- `PENDING_INVENTORY_POSTING`: ventas pagadas sin postear a inventario

## Reposición sugerida
Calcula cantidad a comprar según consumo promedio, cobertura objetivo (~10 días) y stock mínimo. Incluye costo estimado (solo roles de gestión).
