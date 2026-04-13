DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE username = 'admin') THEN
        INSERT INTO app_users (username, full_name, email, password_hash, is_active)
        VALUES ('admin', 'Administrador', 'admin@bar.local',
                '$2a$10$X/1E2DUxLrTTvE1N4CxC4uG0VN1ny0fI13kVpWnvWFgfHQdWCak0C', -- password: admin123
                TRUE);
    END IF;
END $$;
