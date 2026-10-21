# 🍽️ CollabDine

**Smart Collaborative Dining & Bill Splitting**

CollabDine is a QR-enabled dining web application concept that lets people at the same table join a shared dining session, place orders collaboratively, coordinate shared dishes, and split the bill. It includes separate diner and kitchen/staff views and real-time updates for supported session activity.

## Features

- **Table-based QR flow:** Open the app for a selected table using a table-specific URL.
- **Collaborative dining sessions:** Start a session as the host or join an active table session.
- **Live session updates:** Socket.IO events keep session members, orders, sharing requests, and bills in sync.
- **Menu and ordering:** Browse the sample menu, add items to the session, and remove eligible pending orders.
- **Shared-dish requests:** Propose a dish to share and let other diners join or confirm the proposal.
- **Host controls:** Transfer host privileges and initiate checkout.
- **Bill-splitting options:** The interface supports single-payer, equal, by-item, and custom billing modes where implemented in the current flow.
- **Payment UI:** Checkout includes payment input/validation flows; this project should not be treated as a production payment gateway.
- **Kitchen/staff view:** View and manage order/session activity through the staff interface.
- **Customer loyalty demo:** In-memory visit tracking is used to demonstrate loyalty status and discounts.
- **PostgreSQL schema draft:** `database/schema.sql` describes relational tables for restaurants, tables, menu items, sessions, members, orders, sharing, bills, and allocations.

> **Implementation note:** The current backend stores sessions, orders, bills, and related demo data in memory. This means data is reset when the backend process restarts. The SQL schema is included as a database design artifact; it does not by itself mean PostgreSQL persistence is connected. Some UI features are demonstrations and require further integration, testing, and security hardening before production use.

## Tech Stack

- **Frontend:** React, Vite, JavaScript, Axios, Lucide React, QR code generation
- **Backend:** Node.js, Express
- **Real-time communication:** Socket.IO
- **Database design:** PostgreSQL SQL schema (draft; current runtime data is in memory)

## Project Structure

```text
CollabDine/
├── backend/
│   ├── server.js
│   └── package.json
├── database/
│   └── schema.sql
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── App.css
        ├── index.css
        └── components/
```

## Prerequisites

- Node.js and npm installed
- Git (optional, for cloning the repository)

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/kanan-05/CollabDine.git
cd CollabDine
```

### 2. Start the backend

Open a terminal in the project root:

```bash
cd backend
npm install
npm start
```

The backend listens on port **5000** by default.

Health endpoints:
- `http://localhost:5000/` — API status
- `http://localhost:5000/api/info` — server/network information
- `http://localhost:5000/api/menu` — sample menu data

Keep this terminal running.

### 3. Start the frontend

Open a **second terminal** from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

The frontend uses the Vite development proxy configuration to communicate with the backend. Run both frontend and backend during local development.

## Demo Flow

1. Open the app and choose a table.
2. Enter a name to start a new dining session as host, or join an existing active session for that table.
3. Browse the menu and add items to the order.
4. Try the shared-dish request flow and observe live order/session updates.
5. Switch to the kitchen/staff view to inspect the staff workflow.
6. Initiate checkout and explore the available bill-splitting and payment UI.

The menu uses **mock/demo prices** intended for testing, not real restaurant pricing.

## API Overview

The backend currently exposes REST endpoints for core demo workflows, including:

- `GET /` — API health message
- `GET /api/info` — API/network information
- `GET /api/menu` — sample menu
- `GET /api/sessions/table/:tableNumber` — active session details for a table
- `POST /api/sessions` — create a dining session
- `POST /api/sessions/:sessionId/join` — join an existing session
- `GET /api/sessions/:sessionId` — retrieve session details
- `POST /api/orders` — add an order item

Additional routes handle host transfer, shared-dish requests, checkout, billing, payments, and staff actions. See `backend/server.js` for the current route implementations.

## Database Schema

The SQL draft is in `database/schema.sql`. It outlines the intended relational model, including restaurants, tables, menu items, dining sessions, session members, orders, share requests, bills, and bill allocations.

At present, the schema is a design artifact; configure a PostgreSQL connection and migrate the backend from in-memory storage before relying on persistent data.

## Limitations & Future Work

- Connect the backend to PostgreSQL for persistent storage.
- Add authentication and authorization for staff and sensitive operations.
- Integrate a real payment provider and verify payment status server-side.
- Review input validation, privacy, security, error handling, and production CORS settings.
- Add automated tests and deployment configuration.
- Connect and evaluate AI recommendation functionality end to end.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Open a pull request describing the change.

## License

No explicit open-source license is currently specified in this repository. All rights are reserved by default unless a license is added.
