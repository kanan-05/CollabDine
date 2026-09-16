-- CollabDine Database Schema
-- Initial database design for the collaborative dining platform

CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    restaurant_id INT REFERENCES restaurants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    available BOOLEAN DEFAULT TRUE
);

CREATE TABLE dining_sessions (
    id SERIAL PRIMARY KEY,
    restaurant_id INT REFERENCES restaurants(id),
    table_number INT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE TABLE session_members (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES dining_sessions(id),
    customer_name VARCHAR(100) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES dining_sessions(id),
    menu_item_id INT REFERENCES menu_items(id),
    quantity INT DEFAULT 1,
    ordered_by INT REFERENCES session_members(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES dining_sessions(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP
);