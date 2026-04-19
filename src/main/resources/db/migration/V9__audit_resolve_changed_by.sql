DROP VIEW IF EXISTS vw_audit_history;

CREATE VIEW vw_audit_history AS
SELECT
    a.audit_id,
    a.table_name,
    a.record_pk,
    a.action_type,
    a.changed_at,
    COALESCE(u.full_name, u.username, 'Sistema') AS changed_by,
    a.old_data,
    a.new_data
FROM audit_log a
LEFT JOIN app_users u ON u.user_id = COALESCE(
    a.changed_by,
    NULLIF(COALESCE(a.new_data ->> 'updated_by', a.old_data ->> 'updated_by'), '')::BIGINT,
    NULLIF(COALESCE(a.new_data ->> 'created_by', a.old_data ->> 'created_by'), '')::BIGINT,
    NULLIF(COALESCE(a.new_data ->> 'cashier_user_id', a.old_data ->> 'cashier_user_id'), '')::BIGINT,
    NULLIF(COALESCE(a.new_data ->> 'user_id', a.old_data ->> 'user_id'), '')::BIGINT,
    NULLIF(COALESCE(a.new_data ->> 'approved_by', a.old_data ->> 'approved_by'), '')::BIGINT
);
