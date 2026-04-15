CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO app_users (username, full_name, email, password_hash, is_active)
VALUES (
    'admin',
    'Administrador',
    'admin@bar.local',
    crypt('admin123', gen_salt('bf')),
    TRUE
)
ON CONFLICT (username) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    is_active = TRUE;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM app_users u
JOIN roles r ON r.role_name = 'ADMINISTRADOR'
WHERE u.username = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
