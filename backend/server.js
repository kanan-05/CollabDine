const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(cors());
app.use(express.json());

const menu = [
    { id: 1, name: "Margherita Pizza", price: 299 },
    { id: 2, name: "Pasta Alfredo", price: 249 },
    { id: 3, name: "Cold Coffee", price: 149 }
];

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to CollabDine API"
    });
});

app.get("/api/menu", (req, res) => {
    res.json(menu);
});

app.post("/api/sessions", (req, res) => {
    const session = {
        id: Date.now(),
        tableNumber: req.body.tableNumber || 1,
        status: "active"
    };

    res.status(201).json(session);
});

app.post("/api/orders", (req, res) => {
    const order = {
        id: Date.now(),
        sessionId: req.body.sessionId,
        item: req.body.item,
        quantity: req.body.quantity || 1
    };

    io.emit("orderUpdated", order);

    res.status(201).json(order);
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinSession", (sessionId) => {
        socket.join(`session-${sessionId}`);
        console.log(`User joined session ${sessionId}`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const PORT = 5000;

server.listen(PORT, () => {
    console.log(`CollabDine backend running on port ${PORT}`);
});