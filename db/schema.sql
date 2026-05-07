-- Users table (replaces Mongoose user model)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    temp_password VARCHAR(255),
    temp_password_time TIMESTAMPTZ,
    activated BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL,
    merchant VARCHAR(512) NOT NULL,
    total NUMERIC(14, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    transaction_date DATE,
    subtotal NUMERIC(14, 2),
    tax_total NUMERIC(14, 2),
    category VARCHAR(255),
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    payment_method VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_email ON expenses (user_email);

CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON expenses (user_email, created_at DESC);
