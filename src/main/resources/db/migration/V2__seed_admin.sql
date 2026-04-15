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
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    is_active = EXCLUDED.is_active;
