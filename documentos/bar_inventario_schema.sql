-- =========================================================
-- INVENTARIO PARA BAR - MODELO COMPLETO
-- Motor: PostgreSQL 14+
-- =========================================================

BEGIN;

-- =========================================================
-- LIMPIEZA OPCIONAL
-- =========================================================
DROP VIEW IF EXISTS vw_audit_history CASCADE;
DROP VIEW IF EXISTS vw_report_inventory_valuation CASCADE;
DROP VIEW IF EXISTS vw_report_consumption CASCADE;
DROP VIEW IF EXISTS vw_report_count_differences CASCADE;
DROP VIEW IF EXISTS vw_report_waste CASCADE;
DROP VIEW IF EXISTS vw_report_movements CASCADE;
DROP VIEW IF EXISTS vw_inventory_current CASCADE;

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS physical_count_items CASCADE;
DROP TABLE IF EXISTS physical_counts CASCADE;
DROP TABLE IF EXISTS stock_balances CASCADE;
DROP TABLE IF EXISTS inventory_transaction_items CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS recipe_items CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS product_supplier_prices CASCADE;
DROP TABLE IF EXISTS product_units CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS units_of_measure CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- =========================================================
-- TABLAS DE SEGURIDAD
-- =========================================================

CREATE TABLE app_users (
                           user_id              BIGSERIAL PRIMARY KEY,
                           username             VARCHAR(50) NOT NULL UNIQUE,
                           full_name            VARCHAR(150) NOT NULL,
                           email                VARCHAR(150) UNIQUE,
                           password_hash        TEXT NOT NULL,
                           is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                           created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
                           updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
                       role_id              BIGSERIAL PRIMARY KEY,
                       role_name            VARCHAR(50) NOT NULL UNIQUE,
                       description          TEXT,
                       created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
                       updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
                             permission_id        BIGSERIAL PRIMARY KEY,
                             permission_code      VARCHAR(100) NOT NULL UNIQUE,
                             description          TEXT
);

CREATE TABLE role_permissions (
                                  role_id              BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
                                  permission_id        BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
                                  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
                            user_id              BIGINT NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
                            role_id              BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
                            PRIMARY KEY (user_id, role_id)
);

-- =========================================================
-- CATÁLOGOS PRINCIPALES
-- =========================================================

CREATE TABLE product_categories (
                                    category_id          BIGSERIAL PRIMARY KEY,
                                    category_name        VARCHAR(100) NOT NULL UNIQUE,
                                    description          TEXT,
                                    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                                    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
                                    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE suppliers (
                           supplier_id          BIGSERIAL PRIMARY KEY,
                           supplier_name        VARCHAR(150) NOT NULL,
                           tax_id               VARCHAR(50),
                           contact_name         VARCHAR(150),
                           phone                VARCHAR(50),
                           email                VARCHAR(150),
                           address              TEXT,
                           is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                           created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
                           updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE units_of_measure (
                                  unit_id              BIGSERIAL PRIMARY KEY,
                                  unit_code            VARCHAR(20) NOT NULL UNIQUE, -- ml, l, bot, und, caja
                                  unit_name            VARCHAR(50) NOT NULL UNIQUE,
                                  unit_type            VARCHAR(30) NOT NULL CHECK (unit_type IN ('VOLUME', 'WEIGHT', 'COUNT')),
                                  created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
                                  updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE locations (
                           location_id          BIGSERIAL PRIMARY KEY,
                           location_name        VARCHAR(100) NOT NULL UNIQUE,
                           location_type        VARCHAR(30) NOT NULL CHECK (location_type IN ('WAREHOUSE', 'BAR', 'KITCHEN', 'FRIDGE', 'AUXILIARY')),
                           description          TEXT,
                           is_active            BOOLEAN NOT NULL DEFAULT TRUE,
                           created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
                           updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
                          product_id                BIGSERIAL PRIMARY KEY,
                          sku                       VARCHAR(50) UNIQUE,
                          product_name              VARCHAR(150) NOT NULL,
                          category_id               BIGINT NOT NULL REFERENCES product_categories(category_id),
                          base_unit_id              BIGINT NOT NULL REFERENCES units_of_measure(unit_id),
                          min_stock_base_qty        NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (min_stock_base_qty >= 0),
                          barcode                   VARCHAR(100),
                          tracks_lot                BOOLEAN NOT NULL DEFAULT FALSE,
                          tracks_expiration         BOOLEAN NOT NULL DEFAULT FALSE,
                          is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
                          notes                     TEXT,
                          created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
                          updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Conversión por producto:
-- factor_to_base = cuántas unidades base representa 1 unidad de esta presentación
-- Ej: whisky base=ml, unidad=botella 750 ml => factor_to_base = 750
CREATE TABLE product_units (
                               product_unit_id           BIGSERIAL PRIMARY KEY,
                               product_id                BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                               unit_id                   BIGINT NOT NULL REFERENCES units_of_measure(unit_id),
                               factor_to_base            NUMERIC(14,4) NOT NULL CHECK (factor_to_base > 0),
                               is_purchase_unit          BOOLEAN NOT NULL DEFAULT FALSE,
                               is_consumption_unit       BOOLEAN NOT NULL DEFAULT FALSE,
                               is_default_unit           BOOLEAN NOT NULL DEFAULT FALSE,
                               UNIQUE (product_id, unit_id)
);

CREATE TABLE product_supplier_prices (
                                         product_supplier_price_id BIGSERIAL PRIMARY KEY,
                                         product_id                BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
                                         supplier_id               BIGINT NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
                                         unit_id                   BIGINT NOT NULL REFERENCES units_of_measure(unit_id),
                                         unit_cost                 NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
                                         valid_from                DATE NOT NULL DEFAULT CURRENT_DATE,
                                         valid_to                  DATE,
                                         is_preferred              BOOLEAN NOT NULL DEFAULT FALSE,
                                         UNIQUE (product_id, supplier_id, unit_id, valid_from)
);

-- =========================================================
-- RECETAS / MENÚ
-- =========================================================

CREATE TABLE recipes (
                         recipe_id             BIGSERIAL PRIMARY KEY,
                         recipe_name           VARCHAR(150) NOT NULL UNIQUE,
                         description           TEXT,
                         is_active             BOOLEAN NOT NULL DEFAULT TRUE,
                         created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                         updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_items (
                              recipe_item_id        BIGSERIAL PRIMARY KEY,
                              recipe_id             BIGINT NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
                              product_id            BIGINT NOT NULL REFERENCES products(product_id),
                              unit_id               BIGINT NOT NULL REFERENCES units_of_measure(unit_id),
                              quantity              NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
                              UNIQUE (recipe_id, product_id, unit_id)
);

CREATE TABLE menu_items (
                            menu_item_id          BIGSERIAL PRIMARY KEY,
                            menu_name             VARCHAR(150) NOT NULL UNIQUE,
                            recipe_id             BIGINT REFERENCES recipes(recipe_id),
                            sale_price            NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
                            is_active             BOOLEAN NOT NULL DEFAULT TRUE,
                            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                            updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================================================
-- VENTAS (para descontar por receta o producto directo)
-- =========================================================

CREATE TABLE sales (
                       sale_id               BIGSERIAL PRIMARY KEY,
                       sale_number           VARCHAR(50) NOT NULL UNIQUE,
                       sale_datetime         TIMESTAMP NOT NULL DEFAULT NOW(),
                       location_id           BIGINT NOT NULL REFERENCES locations(location_id),
                       cashier_user_id       BIGINT REFERENCES app_users(user_id),
                       total_amount          NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
                       status                VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('OPEN', 'PAID', 'CANCELLED')),
                       inventory_processed   BOOLEAN NOT NULL DEFAULT FALSE,
                       created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                       updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
                            sale_item_id          BIGSERIAL PRIMARY KEY,
                            sale_id               BIGINT NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
                            menu_item_id          BIGINT REFERENCES menu_items(menu_item_id),
                            product_id            BIGINT REFERENCES products(product_id),
                            unit_id               BIGINT REFERENCES units_of_measure(unit_id),
                            quantity              NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
                            unit_price            NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
                            line_total            NUMERIC(14,4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
                            CHECK (
                                (menu_item_id IS NOT NULL AND product_id IS NULL)
                                    OR
                                (menu_item_id IS NULL AND product_id IS NOT NULL)
                                )
);

-- =========================================================
-- MOVIMIENTOS DE INVENTARIO
-- =========================================================

CREATE TABLE inventory_transactions (
                                        transaction_id        BIGSERIAL PRIMARY KEY,
                                        transaction_number    VARCHAR(50) NOT NULL UNIQUE,
                                        transaction_type      VARCHAR(30) NOT NULL CHECK (
                                            transaction_type IN (
                                                                 'OPENING_STOCK',
                                                                 'PURCHASE',
                                                                 'SALE',
                                                                 'CONSUMPTION',
                                                                 'WASTE',
                                                                 'ADJUSTMENT_IN',
                                                                 'ADJUSTMENT_OUT',
                                                                 'TRANSFER',
                                                                 'RETURN_TO_SUPPLIER',
                                                                 'RETURN_FROM_CUSTOMER'
                                                )
                                            ),
                                        transaction_date      TIMESTAMP NOT NULL DEFAULT NOW(),
                                        source_location_id    BIGINT REFERENCES locations(location_id),
                                        target_location_id    BIGINT REFERENCES locations(location_id),
                                        supplier_id           BIGINT REFERENCES suppliers(supplier_id),
                                        related_sale_id       BIGINT REFERENCES sales(sale_id),
                                        reference_text        VARCHAR(150),
                                        reason                TEXT,
                                        status                VARCHAR(20) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
                                        created_by            BIGINT REFERENCES app_users(user_id),
                                        approved_by           BIGINT REFERENCES app_users(user_id),
                                        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                                        updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                                        CHECK (source_location_id IS NOT NULL OR target_location_id IS NOT NULL)
);

CREATE TABLE inventory_transaction_items (
                                             transaction_item_id   BIGSERIAL PRIMARY KEY,
                                             transaction_id        BIGINT NOT NULL REFERENCES inventory_transactions(transaction_id) ON DELETE CASCADE,
                                             product_id            BIGINT NOT NULL REFERENCES products(product_id),
                                             unit_id               BIGINT NOT NULL REFERENCES units_of_measure(unit_id),
                                             quantity              NUMERIC(14,4) NOT NULL CHECK (quantity > 0),
                                             quantity_base         NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (quantity_base > 0),
                                             unit_cost             NUMERIC(14,4),
                                             unit_cost_base        NUMERIC(14,6),
                                             lot_number            VARCHAR(100),
                                             expiration_date       DATE,
                                             notes                 TEXT
);

-- Stock acumulado por producto, ubicación y lote
CREATE TABLE stock_balances (
                                stock_balance_id      BIGSERIAL PRIMARY KEY,
                                product_id            BIGINT NOT NULL REFERENCES products(product_id),
                                location_id           BIGINT NOT NULL REFERENCES locations(location_id),
                                lot_number            VARCHAR(100),
                                expiration_date       DATE,
                                quantity_base         NUMERIC(14,4) NOT NULL DEFAULT 0,
                                avg_unit_cost_base    NUMERIC(14,6) NOT NULL DEFAULT 0,
                                last_movement_at      TIMESTAMP,
                                created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                                updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                                UNIQUE (product_id, location_id, lot_number, expiration_date)
);

-- =========================================================
-- CONTEO FÍSICO
-- =========================================================

CREATE TABLE physical_counts (
                                 physical_count_id     BIGSERIAL PRIMARY KEY,
                                 count_number          VARCHAR(50) NOT NULL UNIQUE,
                                 location_id           BIGINT NOT NULL REFERENCES locations(location_id),
                                 count_date            TIMESTAMP NOT NULL DEFAULT NOW(),
                                 status                VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'CLOSED', 'CANCELLED')),
                                 notes                 TEXT,
                                 created_by            BIGINT REFERENCES app_users(user_id),
                                 approved_by           BIGINT REFERENCES app_users(user_id),
                                 created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                                 updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE physical_count_items (
                                      physical_count_item_id BIGSERIAL PRIMARY KEY,
                                      physical_count_id      BIGINT NOT NULL REFERENCES physical_counts(physical_count_id) ON DELETE CASCADE,
                                      product_id             BIGINT NOT NULL REFERENCES products(product_id),
                                      theoretical_qty_base   NUMERIC(14,4) NOT NULL DEFAULT 0,
                                      actual_qty_base        NUMERIC(14,4) NOT NULL DEFAULT 0,
                                      difference_qty_base    NUMERIC(14,4) GENERATED ALWAYS AS (actual_qty_base - theoretical_qty_base) STORED,
                                      notes                  TEXT,
                                      UNIQUE (physical_count_id, product_id)
);

-- =========================================================
-- AUDITORÍA
-- =========================================================

CREATE TABLE audit_log (
                           audit_id              BIGSERIAL PRIMARY KEY,
                           table_name            VARCHAR(100) NOT NULL,
                           record_pk             VARCHAR(200) NOT NULL,
                           action_type           VARCHAR(10) NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
                           changed_by            BIGINT REFERENCES app_users(user_id),
                           changed_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                           old_data              JSONB,
                           new_data              JSONB
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_inventory_txn_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_txn_date ON inventory_transactions(transaction_date);
CREATE INDEX idx_inventory_txn_items_product ON inventory_transaction_items(product_id);
CREATE INDEX idx_stock_balances_product_location ON stock_balances(product_id, location_id);
CREATE INDEX idx_physical_counts_location_date ON physical_counts(location_id, count_date);
CREATE INDEX idx_audit_log_table_pk ON audit_log(table_name, record_pk);
CREATE INDEX idx_sales_date ON sales(sale_datetime);

-- =========================================================
-- FUNCIONES GENERALES
-- =========================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_session_user_id()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
v_user_id TEXT;
BEGIN
    v_user_id := current_setting('app.user_id', true);
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN NULL;
END IF;
RETURN v_user_id::BIGINT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION fn_audit_row()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
v_pk TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_pk := COALESCE(NEW.user_id::TEXT, NEW.role_id::TEXT, NEW.permission_id::TEXT,
                         NEW.category_id::TEXT, NEW.supplier_id::TEXT, NEW.unit_id::TEXT,
                         NEW.location_id::TEXT, NEW.product_id::TEXT, NEW.recipe_id::TEXT,
                         NEW.menu_item_id::TEXT, NEW.sale_id::TEXT, NEW.transaction_id::TEXT,
                         NEW.physical_count_id::TEXT, NEW.audit_id::TEXT, '0');
INSERT INTO audit_log(table_name, record_pk, action_type, changed_by, new_data)
VALUES (TG_TABLE_NAME, v_pk, 'INSERT', fn_get_session_user_id(), to_jsonb(NEW));
RETURN NEW;
ELSIF TG_OP = 'UPDATE' THEN
        v_pk := COALESCE(NEW.user_id::TEXT, NEW.role_id::TEXT, NEW.permission_id::TEXT,
                         NEW.category_id::TEXT, NEW.supplier_id::TEXT, NEW.unit_id::TEXT,
                         NEW.location_id::TEXT, NEW.product_id::TEXT, NEW.recipe_id::TEXT,
                         NEW.menu_item_id::TEXT, NEW.sale_id::TEXT, NEW.transaction_id::TEXT,
                         NEW.physical_count_id::TEXT, '0');
INSERT INTO audit_log(table_name, record_pk, action_type, changed_by, old_data, new_data)
VALUES (TG_TABLE_NAME, v_pk, 'UPDATE', fn_get_session_user_id(), to_jsonb(OLD), to_jsonb(NEW));
RETURN NEW;
ELSE
        v_pk := COALESCE(OLD.user_id::TEXT, OLD.role_id::TEXT, OLD.permission_id::TEXT,
                         OLD.category_id::TEXT, OLD.supplier_id::TEXT, OLD.unit_id::TEXT,
                         OLD.location_id::TEXT, OLD.product_id::TEXT, OLD.recipe_id::TEXT,
                         OLD.menu_item_id::TEXT, OLD.sale_id::TEXT, OLD.transaction_id::TEXT,
                         OLD.physical_count_id::TEXT, '0');
INSERT INTO audit_log(table_name, record_pk, action_type, changed_by, old_data)
VALUES (TG_TABLE_NAME, v_pk, 'DELETE', fn_get_session_user_id(), to_jsonb(OLD));
RETURN OLD;
END IF;
END;
$$;

-- =========================================================
-- FUNCIONES DE CONVERSIÓN
-- =========================================================

CREATE OR REPLACE FUNCTION fn_get_factor_to_base(p_product_id BIGINT, p_unit_id BIGINT)
RETURNS NUMERIC(14,4)
LANGUAGE plpgsql
AS $$
DECLARE
v_factor NUMERIC(14,4);
BEGIN
SELECT factor_to_base
INTO v_factor
FROM product_units
WHERE product_id = p_product_id
  AND unit_id = p_unit_id;

IF v_factor IS NULL THEN
        RAISE EXCEPTION 'No existe conversión para product_id=% y unit_id=%', p_product_id, p_unit_id;
END IF;

RETURN v_factor;
END;
$$;

CREATE OR REPLACE FUNCTION fn_prepare_transaction_item()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
v_factor NUMERIC(14,4);
BEGIN
    v_factor := fn_get_factor_to_base(NEW.product_id, NEW.unit_id);
    NEW.quantity_base := NEW.quantity * v_factor;

    IF NEW.unit_cost IS NOT NULL THEN
        NEW.unit_cost_base := NEW.unit_cost / v_factor;
ELSE
        NEW.unit_cost_base := NULL;
END IF;

RETURN NEW;
END;
$$;

-- =========================================================
-- FUNCIONES DE STOCK
-- =========================================================

CREATE OR REPLACE FUNCTION fn_upsert_stock_balance(
    p_product_id BIGINT,
    p_location_id BIGINT,
    p_lot_number VARCHAR,
    p_expiration_date DATE,
    p_delta_qty_base NUMERIC,
    p_unit_cost_base NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
v_stock_id BIGINT;
    v_old_qty NUMERIC(14,4);
    v_old_avg NUMERIC(14,6);
    v_new_qty NUMERIC(14,4);
    v_new_avg NUMERIC(14,6);
BEGIN
SELECT stock_balance_id, quantity_base, avg_unit_cost_base
INTO v_stock_id, v_old_qty, v_old_avg
FROM stock_balances
WHERE product_id = p_product_id
  AND location_id = p_location_id
  AND COALESCE(lot_number, '') = COALESCE(p_lot_number, '')
  AND expiration_date IS NOT DISTINCT FROM p_expiration_date
    FOR UPDATE;

IF v_stock_id IS NULL THEN
        IF p_delta_qty_base < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para product_id=% en location_id=%', p_product_id, p_location_id;
END IF;

INSERT INTO stock_balances (
    product_id, location_id, lot_number, expiration_date,
    quantity_base, avg_unit_cost_base, last_movement_at
) VALUES (
             p_product_id, p_location_id, p_lot_number, p_expiration_date,
             p_delta_qty_base,
             COALESCE(p_unit_cost_base, 0),
             NOW()
         );
ELSE
        v_new_qty := v_old_qty + p_delta_qty_base;

        IF v_new_qty < 0 THEN
            RAISE EXCEPTION 'No se permite stock negativo. product_id=% location_id=%', p_product_id, p_location_id;
END IF;

        IF p_delta_qty_base > 0 AND p_unit_cost_base IS NOT NULL AND v_new_qty > 0 THEN
            v_new_avg := ((v_old_qty * v_old_avg) + (p_delta_qty_base * p_unit_cost_base)) / v_new_qty;
ELSE
            v_new_avg := v_old_avg;
END IF;

UPDATE stock_balances
SET quantity_base = v_new_qty,
    avg_unit_cost_base = COALESCE(v_new_avg, avg_unit_cost_base),
    last_movement_at = NOW(),
    updated_at = NOW()
WHERE stock_balance_id = v_stock_id;
END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_apply_inventory_transaction_item(
    p_transaction_id BIGINT,
    p_product_id BIGINT,
    p_quantity_base NUMERIC,
    p_unit_cost_base NUMERIC,
    p_lot_number VARCHAR,
    p_expiration_date DATE,
    p_reverse BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
v_type VARCHAR(30);
    v_source BIGINT;
    v_target BIGINT;
    v_qty NUMERIC(14,4);
BEGIN
SELECT transaction_type, source_location_id, target_location_id
INTO v_type, v_source, v_target
FROM inventory_transactions
WHERE transaction_id = p_transaction_id;

IF v_type IS NULL THEN
        RAISE EXCEPTION 'No existe transaction_id=%', p_transaction_id;
END IF;

    v_qty := CASE WHEN p_reverse THEN -1 * p_quantity_base ELSE p_quantity_base END;

    IF v_type IN ('OPENING_STOCK', 'PURCHASE', 'RETURN_FROM_CUSTOMER', 'ADJUSTMENT_IN') THEN
        PERFORM fn_upsert_stock_balance(p_product_id, v_target, p_lot_number, p_expiration_date, v_qty, p_unit_cost_base);

    ELSIF v_type IN ('SALE', 'CONSUMPTION', 'WASTE', 'ADJUSTMENT_OUT', 'RETURN_TO_SUPPLIER') THEN
        PERFORM fn_upsert_stock_balance(p_product_id, v_source, p_lot_number, p_expiration_date, -1 * v_qty, p_unit_cost_base);

    ELSIF v_type = 'TRANSFER' THEN
        PERFORM fn_upsert_stock_balance(p_product_id, v_source, p_lot_number, p_expiration_date, -1 * v_qty, p_unit_cost_base);
        PERFORM fn_upsert_stock_balance(p_product_id, v_target, p_lot_number, p_expiration_date, v_qty, p_unit_cost_base);

ELSE
        RAISE EXCEPTION 'Tipo de transacción no soportado: %', v_type;
END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_trg_inventory_item_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
v_status VARCHAR(20);
BEGIN
    IF TG_OP = 'INSERT' THEN
SELECT status INTO v_status FROM inventory_transactions WHERE transaction_id = NEW.transaction_id;
IF v_status = 'POSTED' THEN
            PERFORM fn_apply_inventory_transaction_item(
                NEW.transaction_id, NEW.product_id, NEW.quantity_base,
                NEW.unit_cost_base, NEW.lot_number, NEW.expiration_date, FALSE
            );
END IF;
RETURN NEW;

ELSIF TG_OP = 'UPDATE' THEN
SELECT status INTO v_status FROM inventory_transactions WHERE transaction_id = OLD.transaction_id;
IF v_status = 'POSTED' THEN
            PERFORM fn_apply_inventory_transaction_item(
                OLD.transaction_id, OLD.product_id, OLD.quantity_base,
                OLD.unit_cost_base, OLD.lot_number, OLD.expiration_date, TRUE
            );
END IF;

SELECT status INTO v_status FROM inventory_transactions WHERE transaction_id = NEW.transaction_id;
IF v_status = 'POSTED' THEN
            PERFORM fn_apply_inventory_transaction_item(
                NEW.transaction_id, NEW.product_id, NEW.quantity_base,
                NEW.unit_cost_base, NEW.lot_number, NEW.expiration_date, FALSE
            );
END IF;
RETURN NEW;

ELSIF TG_OP = 'DELETE' THEN
SELECT status INTO v_status FROM inventory_transactions WHERE transaction_id = OLD.transaction_id;
IF v_status = 'POSTED' THEN
            PERFORM fn_apply_inventory_transaction_item(
                OLD.transaction_id, OLD.product_id, OLD.quantity_base,
                OLD.unit_cost_base, OLD.lot_number, OLD.expiration_date, TRUE
            );
END IF;
RETURN OLD;
END IF;

RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION fn_trg_inventory_transaction_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
rec RECORD;
BEGIN
    IF OLD.status <> NEW.status THEN
        IF OLD.status <> 'POSTED' AND NEW.status = 'POSTED' THEN
            FOR rec IN
SELECT * FROM inventory_transaction_items WHERE transaction_id = NEW.transaction_id
    LOOP
                PERFORM fn_apply_inventory_transaction_item(
                    rec.transaction_id, rec.product_id, rec.quantity_base,
                    rec.unit_cost_base, rec.lot_number, rec.expiration_date, FALSE
                );
END LOOP;

        ELSIF OLD.status = 'POSTED' AND NEW.status <> 'POSTED' THEN
            FOR rec IN
SELECT * FROM inventory_transaction_items WHERE transaction_id = NEW.transaction_id
    LOOP
                PERFORM fn_apply_inventory_transaction_item(
                    rec.transaction_id, rec.product_id, rec.quantity_base,
                    rec.unit_cost_base, rec.lot_number, rec.expiration_date, TRUE
                );
END LOOP;
END IF;
END IF;

RETURN NEW;
END;
$$;

-- =========================================================
-- FUNCIÓN PARA PROCESAR VENTAS Y DESCONTAR RECETAS
-- =========================================================

CREATE OR REPLACE FUNCTION fn_post_sale_to_inventory(p_sale_id BIGINT, p_user_id BIGINT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
v_sale RECORD;
    v_txn_id BIGINT;
    v_txn_number VARCHAR(50);
    rec_item RECORD;
    rec_recipe RECORD;
    v_default_unit_id BIGINT;
BEGIN
SELECT *
INTO v_sale
FROM sales
WHERE sale_id = p_sale_id
  AND status = 'PAID'
  AND inventory_processed = FALSE;

IF v_sale.sale_id IS NULL THEN
        RAISE EXCEPTION 'La venta no existe, no está pagada o ya fue procesada: sale_id=%', p_sale_id;
END IF;

    v_txn_number := 'SALE-' || p_sale_id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;

INSERT INTO inventory_transactions (
    transaction_number, transaction_type, transaction_date,
    source_location_id, related_sale_id, reference_text,
    status, created_by, approved_by
) VALUES (
             v_txn_number, 'SALE', v_sale.sale_datetime,
             v_sale.location_id, v_sale.sale_id, 'Venta ' || v_sale.sale_number,
             'POSTED', COALESCE(p_user_id, v_sale.cashier_user_id), COALESCE(p_user_id, v_sale.cashier_user_id)
         )
    RETURNING transaction_id INTO v_txn_id;

FOR rec_item IN
SELECT si.*
FROM sale_items si
WHERE si.sale_id = p_sale_id
    LOOP
        -- Si es producto directo
        IF rec_item.product_id IS NOT NULL THEN
            IF rec_item.unit_id IS NULL THEN
SELECT pu.unit_id
INTO v_default_unit_id
FROM product_units pu
WHERE pu.product_id = rec_item.product_id
  AND pu.is_consumption_unit = TRUE
    LIMIT 1;

IF v_default_unit_id IS NULL THEN
                    RAISE EXCEPTION 'Producto % no tiene unidad de consumo configurada', rec_item.product_id;
END IF;
ELSE
                v_default_unit_id := rec_item.unit_id;
END IF;

INSERT INTO inventory_transaction_items (
    transaction_id, product_id, unit_id, quantity, unit_cost, notes
) VALUES (
             v_txn_id, rec_item.product_id, v_default_unit_id, rec_item.quantity, NULL,
             'Salida por venta directa'
         );
END IF;

        -- Si es item del menú con receta
        IF rec_item.menu_item_id IS NOT NULL THEN
            FOR rec_recipe IN
SELECT ri.product_id, ri.unit_id, (ri.quantity * rec_item.quantity) AS total_qty
FROM menu_items mi
         JOIN recipe_items ri ON ri.recipe_id = mi.recipe_id
WHERE mi.menu_item_id = rec_item.menu_item_id
    LOOP
INSERT INTO inventory_transaction_items (
    transaction_id, product_id, unit_id, quantity, unit_cost, notes
) VALUES (
    v_txn_id, rec_recipe.product_id, rec_recipe.unit_id, rec_recipe.total_qty, NULL,
    'Salida por receta desde venta'
    );
END LOOP;
END IF;
END LOOP;

UPDATE sales
SET inventory_processed = TRUE,
    updated_at = NOW()
WHERE sale_id = p_sale_id;

RETURN v_txn_id;
END;
$$;

-- =========================================================
-- FUNCIÓN PARA CERRAR CONTEO FÍSICO Y GENERAR AJUSTES
-- =========================================================

CREATE OR REPLACE FUNCTION fn_close_physical_count(p_physical_count_id BIGINT, p_user_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
v_count RECORD;
    v_txn_in_id BIGINT;
    v_txn_out_id BIGINT;
    v_txn_in_number VARCHAR(50);
    v_txn_out_number VARCHAR(50);
    rec RECORD;
    v_base_unit BIGINT;
BEGIN
SELECT *
INTO v_count
FROM physical_counts
WHERE physical_count_id = p_physical_count_id
  AND status IN ('DRAFT', 'IN_PROGRESS');

IF v_count.physical_count_id IS NULL THEN
        RAISE EXCEPTION 'Conteo no encontrado o ya cerrado: %', p_physical_count_id;
END IF;

    v_txn_in_number  := 'ADJIN-'  || p_physical_count_id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    v_txn_out_number := 'ADJOUT-' || p_physical_count_id || '-' || EXTRACT(EPOCH FROM NOW())::BIGINT;

INSERT INTO inventory_transactions (
    transaction_number, transaction_type, transaction_date, target_location_id,
    reference_text, reason, status, created_by, approved_by
) VALUES (
             v_txn_in_number, 'ADJUSTMENT_IN', NOW(), v_count.location_id,
             'Conteo ' || v_count.count_number, 'Ajuste positivo por conteo físico', 'POSTED', p_user_id, p_user_id
         )
    RETURNING transaction_id INTO v_txn_in_id;

INSERT INTO inventory_transactions (
    transaction_number, transaction_type, transaction_date, source_location_id,
    reference_text, reason, status, created_by, approved_by
) VALUES (
             v_txn_out_number, 'ADJUSTMENT_OUT', NOW(), v_count.location_id,
             'Conteo ' || v_count.count_number, 'Ajuste negativo por conteo físico', 'POSTED', p_user_id, p_user_id
         )
    RETURNING transaction_id INTO v_txn_out_id;

FOR rec IN
SELECT *
FROM physical_count_items
WHERE physical_count_id = p_physical_count_id
  AND difference_qty_base <> 0
    LOOP
SELECT base_unit_id INTO v_base_unit
FROM products
WHERE product_id = rec.product_id;

IF rec.difference_qty_base > 0 THEN
            INSERT INTO inventory_transaction_items (
                transaction_id, product_id, unit_id, quantity, unit_cost, notes
            ) VALUES (
                v_txn_in_id, rec.product_id, v_base_unit, rec.difference_qty_base, NULL, 'Ajuste por conteo'
            );
ELSE
            INSERT INTO inventory_transaction_items (
                transaction_id, product_id, unit_id, quantity, unit_cost, notes
            ) VALUES (
                v_txn_out_id, rec.product_id, v_base_unit, ABS(rec.difference_qty_base), NULL, 'Ajuste por conteo'
            );
END IF;
END LOOP;

UPDATE physical_counts
SET status = 'CLOSED',
    approved_by = p_user_id,
    updated_at = NOW()
WHERE physical_count_id = p_physical_count_id;
END;
$$;

-- =========================================================
-- TRIGGERS DE UPDATED_AT
-- =========================================================

CREATE TRIGGER trg_app_users_updated_at
    BEFORE UPDATE ON app_users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_units_updated_at
    BEFORE UPDATE ON units_of_measure
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_inventory_transactions_updated_at
    BEFORE UPDATE ON inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_stock_balances_updated_at
    BEFORE UPDATE ON stock_balances
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_physical_counts_updated_at
    BEFORE UPDATE ON physical_counts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =========================================================
-- TRIGGERS DE PREPARACIÓN Y STOCK
-- =========================================================

CREATE TRIGGER trg_prepare_inventory_item
    BEFORE INSERT OR UPDATE ON inventory_transaction_items
                         FOR EACH ROW EXECUTE FUNCTION fn_prepare_transaction_item();

CREATE TRIGGER trg_inventory_item_stock
    AFTER INSERT OR UPDATE OR DELETE ON inventory_transaction_items
    FOR EACH ROW EXECUTE FUNCTION fn_trg_inventory_item_stock();

CREATE TRIGGER trg_inventory_transaction_status
    AFTER UPDATE ON inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_trg_inventory_transaction_status();

-- =========================================================
-- TRIGGERS DE AUDITORÍA
-- =========================================================

CREATE TRIGGER trg_audit_app_users
    AFTER INSERT OR UPDATE OR DELETE ON app_users
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_roles
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_suppliers
    AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_locations
    AFTER INSERT OR UPDATE OR DELETE ON locations
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_recipes
    AFTER INSERT OR UPDATE OR DELETE ON recipes
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_menu_items
    AFTER INSERT OR UPDATE OR DELETE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_inventory_transactions
    AFTER INSERT OR UPDATE OR DELETE ON inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

CREATE TRIGGER trg_audit_physical_counts
    AFTER INSERT OR UPDATE OR DELETE ON physical_counts
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();

-- =========================================================
-- VISTAS DE REPORTES
-- =========================================================

CREATE OR REPLACE VIEW vw_inventory_current AS
SELECT
    sb.stock_balance_id,
    p.product_id,
    p.product_name,
    c.category_name,
    l.location_id,
    l.location_name,
    u.unit_code AS base_unit,
    sb.lot_number,
    sb.expiration_date,
    sb.quantity_base,
    p.min_stock_base_qty,
    CASE WHEN sb.quantity_base <= p.min_stock_base_qty THEN TRUE ELSE FALSE END AS below_min_stock,
    sb.avg_unit_cost_base,
    (sb.quantity_base * sb.avg_unit_cost_base) AS total_value
FROM stock_balances sb
         JOIN products p ON p.product_id = sb.product_id
         JOIN product_categories c ON c.category_id = p.category_id
         JOIN locations l ON l.location_id = sb.location_id
         JOIN units_of_measure u ON u.unit_id = p.base_unit_id;

CREATE OR REPLACE VIEW vw_report_movements AS
SELECT
    it.transaction_id,
    it.transaction_number,
    it.transaction_type,
    it.transaction_date,
    src.location_name AS source_location,
    tgt.location_name AS target_location,
    p.product_id,
    p.product_name,
    iti.unit_id,
    u.unit_code,
    iti.quantity,
    iti.quantity_base,
    iti.unit_cost,
    iti.unit_cost_base,
    iti.lot_number,
    iti.expiration_date,
    it.reference_text,
    it.reason,
    it.status,
    au.full_name AS created_by
FROM inventory_transactions it
         JOIN inventory_transaction_items iti ON iti.transaction_id = it.transaction_id
         JOIN products p ON p.product_id = iti.product_id
         JOIN units_of_measure u ON u.unit_id = iti.unit_id
         LEFT JOIN locations src ON src.location_id = it.source_location_id
         LEFT JOIN locations tgt ON tgt.location_id = it.target_location_id
         LEFT JOIN app_users au ON au.user_id = it.created_by;

CREATE OR REPLACE VIEW vw_report_waste AS
SELECT *
FROM vw_report_movements
WHERE transaction_type = 'WASTE';

CREATE OR REPLACE VIEW vw_report_count_differences AS
SELECT
    pc.physical_count_id,
    pc.count_number,
    pc.count_date,
    l.location_name,
    p.product_id,
    p.product_name,
    pci.theoretical_qty_base,
    pci.actual_qty_base,
    pci.difference_qty_base,
    u.unit_code AS base_unit,
    au.full_name AS created_by,
    ap.full_name AS approved_by
FROM physical_counts pc
         JOIN physical_count_items pci ON pci.physical_count_id = pc.physical_count_id
         JOIN products p ON p.product_id = pci.product_id
         JOIN units_of_measure u ON u.unit_id = p.base_unit_id
         JOIN locations l ON l.location_id = pc.location_id
         LEFT JOIN app_users au ON au.user_id = pc.created_by
         LEFT JOIN app_users ap ON ap.user_id = pc.approved_by;

CREATE OR REPLACE VIEW vw_report_consumption AS
SELECT *
FROM vw_report_movements
WHERE transaction_type IN ('SALE', 'CONSUMPTION');

CREATE OR REPLACE VIEW vw_report_inventory_valuation AS
SELECT
    p.product_id,
    p.product_name,
    c.category_name,
    l.location_id,
    l.location_name,
    u.unit_code AS base_unit,
    SUM(sb.quantity_base) AS total_qty_base,
    AVG(sb.avg_unit_cost_base) AS avg_cost_base,
    SUM(sb.quantity_base * sb.avg_unit_cost_base) AS total_inventory_value
FROM stock_balances sb
         JOIN products p ON p.product_id = sb.product_id
         JOIN product_categories c ON c.category_id = p.category_id
         JOIN locations l ON l.location_id = sb.location_id
         JOIN units_of_measure u ON u.unit_id = p.base_unit_id
GROUP BY
    p.product_id, p.product_name, c.category_name,
    l.location_id, l.location_name, u.unit_code;

CREATE OR REPLACE VIEW vw_audit_history AS
SELECT
    a.audit_id,
    a.table_name,
    a.record_pk,
    a.action_type,
    a.changed_at,
    u.full_name AS changed_by,
    a.old_data,
    a.new_data
FROM audit_log a
         LEFT JOIN app_users u ON u.user_id = a.changed_by;

-- =========================================================
-- DATOS BASE OPCIONALES
-- =========================================================

INSERT INTO roles (role_name, description) VALUES
                                               ('ADMINISTRADOR', 'Acceso total'),
                                               ('GERENTE', 'Consulta reportes y aprueba ajustes'),
                                               ('INVENTARIO', 'Gestiona compras, conteos y movimientos'),
                                               ('BARTENDER', 'Registra salidas y consulta stock'),
                                               ('CAJERO', 'Registra ventas');

INSERT INTO permissions (permission_code, description) VALUES
                                                           ('USERS_MANAGE', 'Gestionar usuarios'),
                                                           ('ROLES_MANAGE', 'Gestionar roles'),
                                                           ('PRODUCTS_MANAGE', 'Gestionar productos'),
                                                           ('SUPPLIERS_MANAGE', 'Gestionar proveedores'),
                                                           ('PURCHASES_MANAGE', 'Gestionar compras'),
                                                           ('MOVEMENTS_MANAGE', 'Gestionar movimientos'),
                                                           ('WASTE_MANAGE', 'Gestionar mermas'),
                                                           ('COUNTS_MANAGE', 'Gestionar conteos'),
                                                           ('ADJUSTMENTS_APPROVE', 'Aprobar ajustes'),
                                                           ('REPORTS_VIEW', 'Ver reportes'),
                                                           ('AUDIT_VIEW', 'Ver auditoría');

INSERT INTO units_of_measure (unit_code, unit_name, unit_type) VALUES
                                                                   ('ml', 'Mililitro', 'VOLUME'),
                                                                   ('l', 'Litro', 'VOLUME'),
                                                                   ('und', 'Unidad', 'COUNT'),
                                                                   ('bot', 'Botella', 'COUNT'),
                                                                   ('caja', 'Caja', 'COUNT');

INSERT INTO locations (location_name, location_type, description) VALUES
                                                                      ('Bodega Principal', 'WAREHOUSE', 'Almacén central'),
                                                                      ('Barra Principal', 'BAR', 'Barra de servicio'),
                                                                      ('Cocina', 'KITCHEN', 'Área de cocina'),
                                                                      ('Nevera', 'FRIDGE', 'Refrigeración');

COMMIT;