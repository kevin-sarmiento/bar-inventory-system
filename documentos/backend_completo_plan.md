# Plan de Backend Completo

## Estado actual
- Base funcional con JWT, Flyway, modulos de inventario, ventas, conteos y reportes.
- Se corrigieron bloqueos de login/admin, validaciones base y contrato de `units`.

## Fase 1 - Estabilizacion funcional (en curso)
- [x] Corregir contrato `units_of_measure` (`unitType`).
- [x] Hacer idempotente el seed del admin y asegurar credenciales.
- [x] Asegurar rol `ADMINISTRADOR` para usuario `admin`.
- [x] Agregar validaciones de entrada en DTOs y entidades usadas en CRUD.
- [x] Mejorar respuesta de errores de validacion (detalle por campo).
- [ ] Cerrar inconsistencias restantes entre modelos Java y columnas SQL.

## Fase 2 - Seguridad y permisos
- [ ] Cargar roles reales del usuario en el token y enforcement por endpoint.
- [ ] Definir matriz de permisos por modulo (inventario, ventas, reportes, auditoria).
- [ ] Proteger endpoints criticos con autorizacion por rol.
- [ ] Endurecer configuracion CORS por entorno.

## Fase 3 - Reglas de negocio
- [ ] Validaciones transaccionales (ubicaciones origen/destino segun tipo de movimiento).
- [ ] Reglas de stock negativo, lotes y expiraciones.
- [ ] Reglas de cierre de conteo y ajustes automáticos.
- [ ] Reglas de posteo de venta a inventario con idempotencia.

## Fase 4 - Calidad y pruebas
- [ ] Tests unitarios de servicios.
- [ ] Tests de integracion para flujos criticos (login, compra, venta, reporte).
- [ ] Collection Postman final con tests de regresion.
- [ ] Pipeline de build + tests.

## Fase 5 - Operacion y produccion
- [ ] Actuator health/readiness/liveness.
- [ ] Logging estructurado y trazabilidad.
- [ ] Documentacion API final (Swagger + guia operativa).
- [ ] Versionado de API y control de cambios.
