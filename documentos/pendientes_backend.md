# Pendientes para completar el backend

1. **Items de transacción y stock**
   - Crear entidad, repositorio y servicio para `inventory_transaction_items`.
   - Al crear transacciones, calcular y persistir ítems.
   - Actualizar `stock_balances` (entradas/salidas) y validar stock no negativo.

2. **Conteos físicos y auditoría**
   - Endpoints para `physical_counts` y `physical_count_items`.
   - Generar ajustes desde diferencias de conteo.
   - Registrar `audit_log` en operaciones clave.

3. **Ventas/recetas/menú**
   - Exponer CRUDs básicos para `sales`, `sale_items`, `recipes`, `recipe_items`, `menu_items`.
   - Reglas: consumo por receta al vender.

4. **Reportes adicionales**
   - Implementar vistas `vw_report_waste`, `vw_report_consumption`, `vw_report_count_differences` y exponer endpoints.

5. **Calidad y DX**
   - Añadir Swagger/OpenAPI.
   - Paginación y ordenamiento en listados.
   - Manejador global de errores (formato estándar).
   - Pruebas con WebTestClient (auth, CRUD, reportes).

6. **Seguridad y configuración**
   - Endpoints para gestión de usuarios/roles/permissions (o seed adicional).
   - Configurar CORS por dominios permitidos en producción.

7. **CI/CD opcional**
   - Workflow de build/test en GitHub Actions.
