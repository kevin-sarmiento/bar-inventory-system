ALTER TABLE products
    ADD COLUMN default_location_id BIGINT REFERENCES locations (location_id);

CREATE INDEX idx_products_default_location ON products (default_location_id);
