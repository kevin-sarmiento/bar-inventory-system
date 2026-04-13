 ## Flujo de proceso de inventario (alto nivel)
1. **Autenticación**: usuario ingresa credenciales y obtiene JWT.
2. **Maestros**:
   - Crear unidades de medida.
   - Crear categorías de producto.
   - Registrar proveedores.
   - Crear productos (asignar unidad base, categoría, stock mínimo).
3. **Operaciones de inventario**:
   - Compras: entrada de stock desde proveedor (transaction_type=PURCHASE).
   - Ventas: salida de stock (SALE) asociada a punto de venta.
   - Ajustes: correcciones por merma, conteo físico o traslado (ADJUSTMENT_IN/OUT, TRANSFER).
4. **Conteos físicos**: registrar conteo, comparar vs stock teórico, generar ajustes.
5. **Reportes y consultas**:
   - Stock actual por producto y ubicación.
   - Movimientos por rango de fechas.
   - Mermas y diferencias de conteo.
6. **Auditoría**: cada transacción registra usuario y fecha.
