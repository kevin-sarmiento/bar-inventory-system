ALTER TABLE sales
    ADD COLUMN created_by BIGINT REFERENCES app_users (user_id);

UPDATE sales
SET created_by = cashier_user_id
WHERE created_by IS NULL;

CREATE INDEX idx_sales_created_by ON sales (created_by);

CREATE SEQUENCE sale_public_number_seq;
SELECT setval(
 'sale_public_number_seq',
        GREATEST(
                COALESCE((SELECT MAX(sale_id) FROM sales), 0),
                COALESCE(
                        (SELECT MAX(
                                        CAST(
                                                SUBSTRING(sale_number FROM 5) AS BIGINT
                                        )
                                )
                         FROM sales
                         WHERE sale_number ~ '^VTA-[0-9]+$'),
                        0
                )
        )
 );
