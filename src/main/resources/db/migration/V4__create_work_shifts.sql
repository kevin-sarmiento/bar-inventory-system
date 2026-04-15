CREATE TABLE work_shifts (
    shift_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(user_id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES locations(location_id),
    role_name VARCHAR(50) NOT NULL,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'MISSED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (scheduled_end > scheduled_start),
    CHECK (actual_end IS NULL OR actual_start IS NOT NULL),
    CHECK (actual_end IS NULL OR actual_end >= actual_start)
);

CREATE INDEX idx_work_shifts_user_start ON work_shifts(user_id, scheduled_start);
CREATE INDEX idx_work_shifts_location_start ON work_shifts(location_id, scheduled_start);
CREATE INDEX idx_work_shifts_status ON work_shifts(status);

CREATE TRIGGER trg_work_shifts_updated_at
    BEFORE UPDATE ON work_shifts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_audit_work_shifts
    AFTER INSERT OR UPDATE OR DELETE ON work_shifts
    FOR EACH ROW EXECUTE FUNCTION fn_audit_row();
