CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO app_users (username, full_name, email, password_hash, is_active)
VALUES
    ('gerente', 'Gerente General', 'gerente@sake.local', crypt('Gerente123', gen_salt('bf')), TRUE),
    ('inventario', 'Responsable Inventario', 'inventario@sake.local', crypt('Inventario123', gen_salt('bf')), TRUE),
    ('cajero', 'Caja Principal', 'cajero@sake.local', crypt('Cajero123', gen_salt('bf')), TRUE),
    ('bartender', 'Bartender Principal', 'bartender@sake.local', crypt('Bartender123', gen_salt('bf')), TRUE)
ON CONFLICT (username) DO UPDATE
SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM app_users u
JOIN roles r ON r.role_name = 'GERENTE'
WHERE u.username = 'gerente'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM app_users u
JOIN roles r ON r.role_name = 'INVENTARIO'
WHERE u.username = 'inventario'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM app_users u
JOIN roles r ON r.role_name = 'CAJERO'
WHERE u.username = 'cajero'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM app_users u
JOIN roles r ON r.role_name = 'BARTENDER'
WHERE u.username = 'bartender'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO product_categories (category_name, description, is_active)
VALUES
    ('Destilados', 'Bases clasicas para cocteleria.', TRUE),
    ('Licores', 'Complementos y licores de apoyo.', TRUE),
    ('Jugos y mixers', 'Jugos, sodas y mezcladores.', TRUE),
    ('Garnish', 'Frutas, hierbas y decoraciones.', TRUE)
ON CONFLICT (category_name) DO UPDATE
SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

INSERT INTO units_of_measure (unit_code, unit_name, unit_type)
VALUES
    ('g', 'Gramo', 'WEIGHT')
ON CONFLICT (unit_code) DO NOTHING;

INSERT INTO suppliers (supplier_name, phone, email, address, is_active)
SELECT 'Distribuidora Tropical', '3000000001', 'ventas@tropical.local', 'Avenida Central 101', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM suppliers WHERE lower(supplier_name) = lower('Distribuidora Tropical')
);

INSERT INTO suppliers (supplier_name, phone, email, address, is_active)
SELECT 'Bebidas Caribe', '3000000002', 'pedidos@caribe.local', 'Calle 10 #20-30', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM suppliers WHERE lower(supplier_name) = lower('Bebidas Caribe')
);

INSERT INTO locations (location_name, location_type, description, is_active)
SELECT 'Nevera Cocteleria', 'FRIDGE', 'Insumos frios y garnish.', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM locations WHERE lower(location_name) = lower('Nevera Cocteleria')
);

INSERT INTO products (
    sku,
    product_name,
    category_id,
    base_unit_id,
    min_stock_base_qty,
    barcode,
    tracks_lot,
    tracks_expiration,
    is_active,
    notes
)
SELECT
    'RON-BLANCO-001',
    'Ron Blanco',
    c.category_id,
    u.unit_id,
    1000,
    NULL,
    FALSE,
    FALSE,
    TRUE,
    'Base para cocteleria clasica.'
FROM product_categories c
JOIN units_of_measure u ON u.unit_code = 'ml'
WHERE c.category_name = 'Destilados'
ON CONFLICT (sku) DO UPDATE
SET
    product_name = EXCLUDED.product_name,
    category_id = EXCLUDED.category_id,
    base_unit_id = EXCLUDED.base_unit_id,
    min_stock_base_qty = EXCLUDED.min_stock_base_qty,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes;

INSERT INTO products (
    sku,
    product_name,
    category_id,
    base_unit_id,
    min_stock_base_qty,
    barcode,
    tracks_lot,
    tracks_expiration,
    is_active,
    notes
)
SELECT
    'VODKA-001',
    'Vodka',
    c.category_id,
    u.unit_id,
    1000,
    NULL,
    FALSE,
    FALSE,
    TRUE,
    'Base neutra para mezclas.'
FROM product_categories c
JOIN units_of_measure u ON u.unit_code = 'ml'
WHERE c.category_name = 'Destilados'
ON CONFLICT (sku) DO UPDATE
SET
    product_name = EXCLUDED.product_name,
    category_id = EXCLUDED.category_id,
    base_unit_id = EXCLUDED.base_unit_id,
    min_stock_base_qty = EXCLUDED.min_stock_base_qty,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes;

INSERT INTO products (
    sku,
    product_name,
    category_id,
    base_unit_id,
    min_stock_base_qty,
    barcode,
    tracks_lot,
    tracks_expiration,
    is_active,
    notes
)
SELECT
    'GIN-001',
    'Ginebra',
    c.category_id,
    u.unit_id,
    1000,
    NULL,
    FALSE,
    FALSE,
    TRUE,
    'Clasico para tragos secos.'
FROM product_categories c
JOIN units_of_measure u ON u.unit_code = 'ml'
WHERE c.category_name = 'Destilados'
ON CONFLICT (sku) DO UPDATE
SET
    product_name = EXCLUDED.product_name,
    category_id = EXCLUDED.category_id,
    base_unit_id = EXCLUDED.base_unit_id,
    min_stock_base_qty = EXCLUDED.min_stock_base_qty,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes;

INSERT INTO products (
    sku,
    product_name,
    category_id,
    base_unit_id,
    min_stock_base_qty,
    barcode,
    tracks_lot,
    tracks_expiration,
    is_active,
    notes
)
SELECT
    'JUGO-LIMON-001',
    'Jugo de limon',
    c.category_id,
    u.unit_id,
    500,
    NULL,
    FALSE,
    FALSE,
    TRUE,
    'Base acida para preparaciones.'
FROM product_categories c
JOIN units_of_measure u ON u.unit_code = 'ml'
WHERE c.category_name = 'Jugos y mixers'
ON CONFLICT (sku) DO UPDATE
SET
    product_name = EXCLUDED.product_name,
    category_id = EXCLUDED.category_id,
    base_unit_id = EXCLUDED.base_unit_id,
    min_stock_base_qty = EXCLUDED.min_stock_base_qty,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes;

INSERT INTO products (
    sku,
    product_name,
    category_id,
    base_unit_id,
    min_stock_base_qty,
    barcode,
    tracks_lot,
    tracks_expiration,
    is_active,
    notes
)
SELECT
    'JARABE-001',
    'Jarabe simple',
    c.category_id,
    u.unit_id,
    500,
    NULL,
    FALSE,
    FALSE,
    TRUE,
    'Soporte para cocteleria dulce.'
FROM product_categories c
JOIN units_of_measure u ON u.unit_code = 'ml'
WHERE c.category_name = 'Licores'
ON CONFLICT (sku) DO UPDATE
SET
    product_name = EXCLUDED.product_name,
    category_id = EXCLUDED.category_id,
    base_unit_id = EXCLUDED.base_unit_id,
    min_stock_base_qty = EXCLUDED.min_stock_base_qty,
    is_active = EXCLUDED.is_active,
    notes = EXCLUDED.notes;
