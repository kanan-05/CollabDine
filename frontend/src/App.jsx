import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [session, setSession] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/menu")
      .then((res) => setMenu(res.data))
      .catch((err) => console.error(err));

    socket.on("orderUpdated", (order) => {
      setOrders((prev) => [...prev, order]);
    });

    return () => socket.off("orderUpdated");
  }, []);

  const createSession = async () => {
    const res = await axios.post(
      "http://localhost:5000/api/sessions",
      { tableNumber: 5 }
    );

    setSession(res.data);
    socket.emit("joinSession", res.data.id);
  };

  const placeOrder = async (item) => {
    await axios.post("http://localhost:5000/api/orders", {
      sessionId: session?.id,
      item: item.name,
      quantity: 1,
    });
  };

  return (
    <div className="page">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <span>🍽️</span>
          <strong>CollabDine</strong>
        </div>

        <div className="nav-status">
          <span className="status-dot"></span>
          Live Dining
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <span className="badge">SMART DINING PLATFORM</span>

          <h1>
            Dine together.<br />
            <span>Order together.</span>
          </h1>

          <p>
            A real-time collaborative dining experience where everyone
            at the table can order, share and manage food together.
          </p>

          {!session ? (
            <button className="primary-btn" onClick={createSession}>
              Join Dining Session →
            </button>
          ) : (
            <div className="session-box">
              <span className="status-dot"></span>
              Session #{session.id} · Table {session.tableNumber}
            </div>
          )}
        </div>
      </section>

      {/* MENU */}
      <main className="content">

        <div className="section-heading">
          <div>
            <span className="section-label">RESTAURANT MENU</span>
            <h2>Choose something delicious</h2>
          </div>

          {session && (
            <span className="live-badge">
              ● SESSION ACTIVE
            </span>
          )}
        </div>

        <div className="menu-grid">
          {menu.map((item, index) => (
            <div className="food-card" key={item.id}>

              <div className={`food-image food-${index}`}>
                {index === 0 && "🍕"}
                {index === 1 && "🍝"}
                {index === 2 && "☕"}
              </div>

              <div className="food-info">
                <h3>{item.name}</h3>

                <p className="description">
                  Freshly prepared and perfect for sharing.
                </p>

                <div className="food-bottom">
                  <strong>₹{item.price}</strong>

                  <button
                    className="add-btn"
                    onClick={() => placeOrder(item)}
                    disabled={!session}
                  >
                    + Add
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* LIVE ORDERS */}
        <section className="orders-section">

          <div className="orders-header">
            <div>
              <span className="section-label">REAL-TIME ACTIVITY</span>
              <h2>Live Orders</h2>
            </div>

            <span className="order-count">
              {orders.length} {orders.length === 1 ? "item" : "items"}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="empty-orders">
              <span>🛒</span>
              <h3>No orders yet</h3>
              <p>
                Join the dining session and add items from the menu.
              </p>
            </div>
          ) : (
            <div className="order-list">
              {orders.map((order) => (
                <div className="order-item" key={order.id}>
                  <div>
                    <strong>{order.item}</strong>
                    <span>Quantity: {order.quantity}</span>
                  </div>

                  <span className="ordered">Added ✓</span>
                </div>
              ))}
            </div>
          )}

        </section>

      </main>

      {/* FOOTER */}
      <footer>
        <strong>CollabDine</strong>
        <span>Real-Time Collaborative Dining Platform</span>
      </footer>

    </div>
  );
}

export default App;