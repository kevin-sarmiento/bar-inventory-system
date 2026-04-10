
-- =========================================================
-- BASE DE DATOS: SISTEMA DE INVENTARIO PARA BAR
-- Motor objetivo: PostgreSQL
-- Arquitectura: Monolito modular
-- =========================================================

DROP TABLE IF EXISTS auditorias CASCADE;
DROP TABLE IF EXISTS detalle_recetas CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS detalle_conteos_inventario CASCADE;
DROP TABLE IF EXISTS conteos_inventario CASCADE;
DROP TABLE IF EXISTS detalle_compras CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS movimientos_inventario CASCADE;
DROP TABLE IF EXISTS tipos_movimiento CASCADE;
DROP TABLE IF EXISTS inventarios CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS unidades_medida CASCADE;
DROP TABLE IF EXISTS categorias_producto CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =========================================================
-- 1. SEGURIDAD Y USUARIOS
-- =========================================================

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    rol_id BIGINT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(30),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- =========================================================
-- 2. CATALOGOS BASE
-- =========================================================

CREATE TABLE categorias_producto (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE unidades_medida (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    abreviatura VARCHAR(20) NOT NULL UNIQUE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE proveedores (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    nit VARCHAR(50) UNIQUE,
    telefono VARCHAR(30),
    correo VARCHAR(150),
    direccion VARCHAR(255),
    contacto_principal VARCHAR(150),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 3. PRODUCTOS E INVENTARIO
-- =========================================================

CREATE TABLE productos (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(255),
    categoria_id BIGINT NOT NULL,
    unidad_medida_id BIGINT NOT NULL,
    proveedor_id BIGINT,
    stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_compra_promedio NUMERIC(12,2) NOT NULL DEFAULT 0,
    es_insumo BOOLEAN NOT NULL DEFAULT FALSE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_producto_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT chk_producto_precio_compra CHECK (precio_compra_promedio >= 0),
    CONSTRAINT fk_producto_categoria
        FOREIGN KEY (categoria_id) REFERENCES categorias_producto(id),
    CONSTRAINT fk_producto_unidad
        FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),
    CONSTRAINT fk_producto_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

CREATE TABLE inventarios (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL UNIQUE,
    stock_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
    ultima_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_inventario_stock_actual CHECK (stock_actual >= 0),
    CONSTRAINT fk_inventario_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE tipos_movimiento (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    direccion VARCHAR(20) NOT NULL,
    afecta_stock BOOLEAN NOT NULL DEFAULT TRUE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_tipo_movimiento_direccion
        CHECK (direccion IN ('ENTRADA', 'SALIDA'))
);

CREATE TABLE movimientos_inventario (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL,
    tipo_movimiento_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL,
    stock_anterior NUMERIC(12,2) NOT NULL,
    stock_nuevo NUMERIC(12,2) NOT NULL,
    motivo VARCHAR(255),
    referencia VARCHAR(100),
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_movimiento_stock_anterior CHECK (stock_anterior >= 0),
    CONSTRAINT chk_movimiento_stock_nuevo CHECK (stock_nuevo >= 0),
    CONSTRAINT fk_movimiento_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_movimiento_tipo
        FOREIGN KEY (tipo_movimiento_id) REFERENCES tipos_movimiento(id),
    CONSTRAINT fk_movimiento_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- =========================================================
-- 4. COMPRAS
-- =========================================================

CREATE TABLE compras (
    id BIGSERIAL PRIMARY KEY,
    numero_compra VARCHAR(50) NOT NULL UNIQUE,
    proveedor_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    fecha_compra DATE NOT NULL,
    total_compra NUMERIC(14,2) NOT NULL DEFAULT 0,
    estado VARCHAR(30) NOT NULL DEFAULT 'REGISTRADA',
    observacion VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_compra_total CHECK (total_compra >= 0),
    CONSTRAINT chk_compra_estado CHECK (estado IN ('REGISTRADA', 'CONFIRMADA', 'ANULADA')),
    CONSTRAINT fk_compra_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    CONSTRAINT fk_compra_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE detalle_compras (
    id BIGSERIAL PRIMARY KEY,
    compra_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_detalle_compra_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_compra_precio CHECK (precio_unitario >= 0),
    CONSTRAINT chk_detalle_compra_subtotal CHECK (subtotal >= 0),
    CONSTRAINT fk_detalle_compra_compra
        FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_compra_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- =========================================================
-- 5. CONTEOS Y CONCILIACION
-- =========================================================

CREATE TABLE conteos_inventario (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    fecha_conteo DATE NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ABIERTO',
    observacion VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_conteo_estado CHECK (estado IN ('ABIERTO', 'FINALIZADO', 'AJUSTADO')),
    CONSTRAINT fk_conteo_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE detalle_conteos_inventario (
    id BIGSERIAL PRIMARY KEY,
    conteo_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    stock_sistema NUMERIC(12,2) NOT NULL,
    stock_fisico NUMERIC(12,2) NOT NULL,
    diferencia NUMERIC(12,2) NOT NULL,
    observacion VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_detalle_conteo_stock_sistema CHECK (stock_sistema >= 0),
    CONSTRAINT chk_detalle_conteo_stock_fisico CHECK (stock_fisico >= 0),
    CONSTRAINT fk_detalle_conteo_conteo
        FOREIGN KEY (conteo_id) REFERENCES conteos_inventario(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_conteo_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT uq_detalle_conteo_producto UNIQUE (conteo_id, producto_id)
);

-- =========================================================
-- 6. RECETAS
-- =========================================================

CREATE TABLE recetas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_recetas (
    id BIGSERIAL PRIMARY KEY,
    receta_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    cantidad NUMERIC(12,2) NOT NULL,
    unidad_medida_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_detalle_receta_cantidad CHECK (cantidad > 0),
    CONSTRAINT fk_detalle_receta_receta
        FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_receta_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id),
    CONSTRAINT fk_detalle_receta_unidad
        FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id),
    CONSTRAINT uq_detalle_receta_producto UNIQUE (receta_id, producto_id)
);

-- =========================================================
-- 7. AUDITORIA
-- =========================================================

CREATE TABLE auditorias (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    ip_origen VARCHAR(50),
    fecha_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- =========================================================
-- 8. INDICES
-- =========================================================

CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_inventarios_producto ON inventarios(producto_id);
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_usuario ON movimientos_inventario(usuario_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha_movimiento);
CREATE INDEX idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX idx_compras_fecha ON compras(fecha_compra);
CREATE INDEX idx_detalle_compra_compra ON detalle_compras(compra_id);
CREATE INDEX idx_conteos_fecha ON conteos_inventario(fecha_conteo);
CREATE INDEX idx_auditoria_fecha ON auditorias(fecha_evento);

-- =========================================================
-- 9. DATOS INICIALES
-- =========================================================

INSERT INTO roles (nombre, descripcion) VALUES
('ADMINISTRADOR', 'Control total del sistema'),
('ENCARGADO_INVENTARIO', 'Gestion operativa del inventario'),
('BARTENDER', 'Registro de salidas operativas y consulta'),
('GERENTE', 'Consulta de reportes e indicadores');

INSERT INTO tipos_movimiento (nombre, descripcion, direccion, afecta_stock) VALUES
('ENTRADA_COMPRA', 'Ingreso por compra a proveedor', 'ENTRADA', TRUE),
('ENTRADA_AJUSTE', 'Ajuste positivo de inventario', 'ENTRADA', TRUE),
('SALIDA_CONSUMO', 'Salida por consumo o preparacion', 'SALIDA', TRUE),
('SALIDA_MERMA', 'Salida por merma o perdida', 'SALIDA', TRUE),
('SALIDA_AJUSTE', 'Ajuste negativo de inventario', 'SALIDA', TRUE),
('ENTRADA_DEVOLUCION', 'Ingreso por devolucion o reintegro', 'ENTRADA', TRUE);

INSERT INTO categorias_producto (nombre, descripcion) VALUES
('Licores', 'Bebidas alcoholicas principales'),
('Cervezas', 'Cervezas y similares'),
('Mixers', 'Gaseosas, jugos y mezcladores'),
('Insumos', 'Ingredientes y materiales de operacion'),
('Cristaleria', 'Vasos, copas y elementos reutilizables');

INSERT INTO unidades_medida (nombre, abreviatura) VALUES
('Botella', 'bot'),
('Mililitro', 'ml'),
('Litro', 'l'),
('Unidad', 'und'),
('Kilogramo', 'kg'),
('Caja', 'cj');

-- =========================================================
-- 10. FLUJO LOGICO DEL SISTEMA
-- =========================================================
-- 1. Se crean roles y usuarios.
-- 2. Se crean categorias, unidades, proveedores y productos.
-- 3. Cada producto debe tener un registro en inventarios.
-- 4. Una compra confirmada crea detalle_compras y movimientos de entrada.
-- 5. Cada movimiento actualiza inventarios.stock_actual.
-- 6. Las salidas operativas y mermas generan movimientos tipo SALIDA.
-- 7. Los conteos comparan stock del sistema vs stock fisico.
-- 8. Si hay diferencias, se registran ajustes como movimientos.
-- 9. Toda accion critica se registra en auditorias.
