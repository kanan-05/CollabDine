-- CollabDine Database Schema
-- Complete relational model for collaborative dining, group splitting, and payments

CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    capacity INT DEFAULT 4,
    qr_code_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    image_tag VARCHAR(50),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dining_sessions (
    id SERIAL PRIMARY KEY,
    restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'checkout', 'completed'
    host_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checkout_started_at TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_members (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES dining_sessions(id) ON DELETE CASCADE,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20),
    is_host BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES dining_sessions(id) ON DELETE CASCADE,
    member_id INT REFERENCES session_members(id) ON DELETE SET NULL,
    member_name VARCHAR(100) NOT NULL,
    menu_item_id INT REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT DEFAULT 1,
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with TEXT[],
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'preparing', 'served', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS share_requests (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES dining_sessions(id) ON DELETE CASCADE,
    creator_id INT REFERENCES session_members(id) ON DELETE CASCADE,
    menu_item_id INT REFERENCES menu_items(id) ON DELETE CASCADE,
    note TEXT,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'confirmed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS share_participants (
    id SERIAL PRIMARY KEY,
    share_request_id INT REFERENCES share_requests(id) ON DELETE CASCADE,
    member_id INT REFERENCES session_members(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES dining_sessions(id) ON DELETE CASCADE,
    mode VARCHAR(20) DEFAULT 'equal', -- 'equal', 'by_item', 'single', 'custom'
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_allocations (
    id SERIAL PRIMARY KEY,
    bill_id INT REFERENCES bills(id) ON DELETE CASCADE,
    member_id INT REFERENCES session_members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP
);
