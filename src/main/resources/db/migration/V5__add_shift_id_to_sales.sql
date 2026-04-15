ALTER TABLE sales
    ADD COLUMN shift_id BIGINT REFERENCES work_shifts(shift_id);

CREATE INDEX idx_sales_shift_id ON sales(shift_id);
