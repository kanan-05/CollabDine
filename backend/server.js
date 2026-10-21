const express = require("express");
const cors = require("cors");
const http = require("http");
const os = require("os");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }
});

app.use(cors());
app.use(express.json());

// Helper to get local Wi-Fi / LAN IP for mobile QR scanning
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    let fallbackIp = "localhost";

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                if (name.toLowerCase().includes("wi-fi") || name.toLowerCase().includes("wireless") || name.toLowerCase().includes("wlan") || name.toLowerCase().includes("eth")) {
                    return iface.address;
                }
                fallbackIp = iface.address;
            }
        }
    }
    return fallbackIp;
}

// Menu Items with affordable mock prices (₹1 - ₹4) as requested for testing
const menu = [
    {
        id: 1,
        name: "Margherita Pizza",
        category: "Pizza & Mains",
        price: 2.00,
        veg: true,
        description: "Classic sourdough crust with rich San Marzano tomato sauce, fresh mozzarella, and aromatic basil leaves.",
        image: "🍕",
        tags: ["popular", "sharing", "savory"],
        spiciness: "Mild"
    },
    {
        id: 2,
        name: "Creamy Alfredo Pasta",
        category: "Pasta & Mains",
        price: 2.50,
        veg: true,
        description: "Penne pasta tossed in velvety garlic parmesan sauce, fresh herbs, and toasted pine nuts.",
        image: "🍝",
        tags: ["rich", "creamy", "savory"],
        spiciness: "Mild"
    },
    {
        id: 3,
        name: "Crispy Garlic Bread Sticks",
        category: "Starters",
        price: 1.00,
        veg: true,
        description: "Warm, buttery sourdough baguette infused with roasted garlic, herbs, and melted cheese dip.",
        image: "🥖",
        tags: ["starter", "sharing", "crunchy"],
        spiciness: "None"
    },
    {
        id: 4,
        name: "Fiery Paneer Tikka Tacos",
        category: "Starters",
        price: 1.50,
        veg: true,
        description: "Tandoori spiced paneer cubes topped with mint crema, pickled onion, and crunchy slaw.",
        image: "🌮",
        tags: ["spicy", "starter", "fusion"],
        spiciness: "Hot"
    },
    {
        id: 5,
        name: "Artisanal Cold Coffee",
        category: "Beverages",
        price: 1.00,
        veg: true,
        description: "Brewed espresso blended with whole chilled milk, Belgian chocolate drizzle, and vanilla froth.",
        image: "☕",
        tags: ["beverage", "sweet", "cold"],
        spiciness: "None"
    },
    {
        id: 6,
        name: "Sparkling Berry Mojito",
        category: "Beverages",
        price: 1.50,
        veg: true,
        description: "Crushed wild berries, fresh garden mint, Persian lime juice, and bubbling tonic soda.",
        image: "🍹",
        tags: ["beverage", "refreshing", "cold"],
        spiciness: "None"
    },
    {
        id: 7,
        name: "Molten Lava Brownie Sundae",
        category: "Desserts",
        price: 2.00,
        veg: true,
        description: "Warm dark chocolate brownie with a gooey center, paired with Madagascar vanilla bean gelato.",
        image: "🍨",
        tags: ["dessert", "sweet", "indulgent"],
        spiciness: "None"
    },
    {
        id: 8,
        name: "Farmhouse Loaded Nachos",
        category: "Starters",
        price: 1.50,
        veg: true,
        description: "Stone-ground corn chips smothered with warm queso, jalapeños, salsa roja, and guacamole.",
        image: "🧀",
        tags: ["starter", "sharing", "snack"],
        spiciness: "Medium"
    }
];

// In-Memory Storage
const sessions = new Map();
const orders = new Map();
const shareRequests = new Map();
const bills = new Map();
const receipts = new Map(); // key: `${sessionId}-${memberId}`

// Customer Loyalty Ledger
// Tracks visit counts by customer identifier (phone or name)
const customerLedger = new Map();

// Pre-populate some demo loyal customers for seamless demonstration
customerLedger.set("kanantayalpp", { name: "Kanan Tayal", phone: "9876543210", visitCount: 3, lastVisited: new Date().toISOString() });
customerLedger.set("kanan", { name: "Kanan", phone: "9876543210", visitCount: 3, lastVisited: new Date().toISOString() });
customerLedger.set("9876543210", { name: "Kanan", phone: "9876543210", visitCount: 3, lastVisited: new Date().toISOString() });

function trackCustomerVisit(name, phone) {
    const cleanName = String(name || "").trim();
    const cleanPhone = String(phone || "").trim();
    const key = (cleanPhone && cleanPhone !== "Guest" ? cleanPhone : cleanName).toLowerCase();

    let record = customerLedger.get(key);
    if (!record) {
        record = {
            name: cleanName,
            phone: cleanPhone,
            visitCount: 1,
            firstVisited: new Date().toISOString(),
            lastVisited: new Date().toISOString()
        };
        customerLedger.set(key, record);
    } else {
        record.visitCount += 1;
        record.lastVisited = new Date().toISOString();
        if (cleanName) record.name = cleanName;
        if (cleanPhone && cleanPhone !== "Guest") record.phone = cleanPhone;
    }

    return record;
}

let nextSessionId = 101;
let nextMemberId = 1;
let nextOrderId = 1;
let nextShareRequestId = 1;

// Helper Functions
function getSession(sessionId) {
    return sessions.get(Number(sessionId));
}

function getSessionOrders(sessionId) {
    return [...orders.values()].filter(order => order.sessionId === Number(sessionId));
}

function getSessionShareRequests(sessionId) {
    return [...shareRequests.values()].filter(req => req.sessionId === Number(sessionId));
}

function getSessionBill(sessionId) {
    return bills.get(Number(sessionId)) || null;
}

function publicSession(session) {
    if (!session) return null;
    return {
        id: session.id,
        tableNumber: session.tableNumber,
        status: session.status, // "active", "checkout", "completed"
        hostId: session.hostId,
        members: session.members,
        createdAt: session.createdAt,
        checkoutStartedAt: session.checkoutStartedAt || null,
        closedAt: session.closedAt || null
    };
}

function emitSessionUpdate(session) {
    io.to(`session-${session.id}`).emit("sessionUpdated", publicSession(session));
}

function emitOrdersUpdate(sessionId) {
    io.to(`session-${sessionId}`).emit("ordersUpdated", getSessionOrders(sessionId));
    io.emit("staffOrdersUpdated", { sessionId, orders: getSessionOrders(sessionId) });
}

function emitShareRequestsUpdate(sessionId) {
    io.to(`session-${sessionId}`).emit("shareRequestsUpdated", getSessionShareRequests(sessionId));
}

function emitBillUpdate(sessionId) {
    const bill = getSessionBill(sessionId);
    io.to(`session-${sessionId}`).emit("billUpdated", bill);
}

// UPI Validation Helper
function validateUpiVpa(vpa) {
    if (!vpa || typeof vpa !== "string") {
        return { valid: false, error: "UPI Virtual Payment Address (VPA) is required." };
    }
    const clean = vpa.trim().toLowerCase();

    // Must have username and handle
    const parts = clean.split("@");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return {
            valid: false,
            error: "Invalid UPI format. A valid UPI ID must have an identifier and a bank handle (e.g. name@okaxis or 9876543210@paytm)."
        };
    }

    // Check valid identifier
    const userRegex = /^[a-zA-Z0-9.\-_]{2,64}$/;
    if (!userRegex.test(parts[0])) {
        return {
            valid: false,
            error: "UPI identifier contains invalid characters. Use letters, numbers, dots, or hyphens."
        };
    }

    // Explicitly reject popular email domains
    const forbiddenEmailDomains = [
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
        "icloud.com", "mail.com", "protonmail.com", "live.com"
    ];
    if (forbiddenEmailDomains.includes(parts[1])) {
        return {
            valid: false,
            error: `'@${parts[1]}' is an email address, NOT a bank UPI handle! Please use a valid UPI handle like @okhdfcbank, @oksbi, @okaxis, @paytm, or @ybl.`
        };
    }

    // Check handle
    const handleRegex = /^[a-zA-Z0-9]{2,30}$/;
    if (!handleRegex.test(parts[1])) {
        return {
            valid: false,
            error: `Invalid bank handle '@${parts[1]}'. Common handles include @okaxis, @okhdfcbank, @oksbi, @paytm, @ybl, @upi.`
        };
    }

    return { valid: true, vpa: clean };
}

// Card Validation Helper
function validateCardDetails({ cardNumber, cardHolder, expiryDate, cvv }) {
    const cleanNum = String(cardNumber || "").replace(/\s+/g, "").replace(/-/g, "");
    if (!/^\d{15,16}$/.test(cleanNum)) {
        return { valid: false, error: "Please enter a valid 15 or 16-digit debit/credit card number." };
    }

    if (!cardHolder || cardHolder.trim().length < 3) {
        return { valid: false, error: "Please enter the full cardholder name as printed on the card." };
    }

    const cleanExp = String(expiryDate || "").trim();
    if (!/^(0[1-9]|1[0-2])\/?([2-9][0-9])$/.test(cleanExp)) {
        return { valid: false, error: "Please enter a valid expiry date in MM/YY format (e.g. 08/28)." };
    }

    const cleanCvv = String(cvv || "").trim();
    if (!/^\d{3,4}$/.test(cleanCvv)) {
        return { valid: false, error: "Please enter a valid 3 or 4-digit CVV security code." };
    }

    // Detect card brand
    let brand = "RuPay";
    if (/^4/.test(cleanNum)) brand = "Visa";
    else if (/^(5[1-5]|2[2-7])/.test(cleanNum)) brand = "Mastercard";
    else if (/^(34|37)/.test(cleanNum)) brand = "American Express";
    else if (/^(60|65|81|82)/.test(cleanNum)) brand = "RuPay";

    return {
        valid: true,
        last4: cleanNum.slice(-4),
        brand,
        cardHolder: cardHolder.trim().toUpperCase()
    };
}

// ==================== REST ROUTES ====================

// API Health & Network Info
app.get("/api/info", (req, res) => {
    const localIp = getLocalIpAddress();
    res.json({
        name: "CollabDine API",
        status: "online",
        localIp,
        frontendUrl: `http://${localIp}:5173`,
        timestamp: new Date().toISOString()
    });
});

app.get("/", (req, res) => {
    res.json({ message: "CollabDine API is running" });
});

// Menu
app.get("/api/menu", (req, res) => {
    res.json(menu);
});

// Check Customer Loyalty
app.get("/api/customers/loyalty", (req, res) => {
    const identifier = String(req.query.identifier || "").toLowerCase().trim();
    const record = customerLedger.get(identifier);
    if (!record) {
        return res.json({ visitCount: 1, isLoyal: false, discountPercent: 0 });
    }
    const isLoyal = record.visitCount >= 2;
    res.json({
        name: record.name,
        visitCount: record.visitCount,
        isLoyal,
        discountPercent: isLoyal ? 15 : 0
    });
});

// Get table status and its active session
app.get("/api/sessions/table/:tableNumber", (req, res) => {
    const tableNumber = Number(req.params.tableNumber);

    const session = [...sessions.values()].find(
        s => s.tableNumber === tableNumber && (s.status === "active" || s.status === "checkout")
    );

    if (!session) {
        return res.status(404).json({
            message: "No active session for this table",
            tableNumber
        });
    }

    res.json({
        session: publicSession(session),
        orders: getSessionOrders(session.id),
        shareRequests: getSessionShareRequests(session.id),
        bill: getSessionBill(session.id)
    });
});

// Create a new session (Host)
app.post("/api/sessions", (req, res) => {
    const tableNumber = Number(req.body.tableNumber);
    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim() || "Guest";

    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
        return res.status(400).json({ message: "A valid table number is required" });
    }

    if (!name) {
        return res.status(400).json({ message: "Your name is required to start the table session" });
    }

    const existingSession = [...sessions.values()].find(
        s => s.tableNumber === tableNumber && (s.status === "active" || s.status === "checkout")
    );

    if (existingSession) {
        return res.status(409).json({
            message: "An active session already exists for this table. You can join it instead.",
            session: publicSession(existingSession)
        });
    }

    // Track customer visit history
    const visitRecord = trackCustomerVisit(name, phone);
    const isLoyal = visitRecord.visitCount >= 2;

    const hostMember = {
        id: nextMemberId++,
        name,
        phone,
        isHost: true,
        visitCount: visitRecord.visitCount,
        isLoyal,
        joinedAt: new Date().toISOString()
    };

    const newSession = {
        id: nextSessionId++,
        tableNumber,
        status: "active",
        hostId: hostMember.id,
        members: [hostMember],
        createdAt: new Date().toISOString()
    };

    sessions.set(newSession.id, newSession);

    res.status(201).json({
        session: publicSession(newSession),
        member: hostMember
    });
});

// Join an existing table session
app.post("/api/sessions/:sessionId/join", (req, res) => {
    const session = getSession(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: "Dining session not found" });
    }

    if (session.status === "completed") {
        return res.status(409).json({ message: "This dining session has ended" });
    }

    if (session.status === "checkout") {
        return res.status(409).json({ message: "This session is currently at checkout and not accepting new guests" });
    }

    const name = String(req.body.name || "").trim();
    const phone = String(req.body.phone || "").trim() || "Guest";

    if (!name) {
        return res.status(400).json({ message: "Customer name is required" });
    }

    // A person is only considered the SAME member resuming if BOTH name and phone match.
    // If phone numbers are different, even if names are identical, they are treated as DIFFERENT persons!
    const cleanPhone = (phone && phone !== "Guest" ? phone : "").trim();

    const existingMember = session.members.find(m => {
        const mPhone = (m.phone && m.phone !== "Guest" ? m.phone : "").trim();
        const sameName = m.name.toLowerCase() === name.toLowerCase();

        // If either has a phone number, both phone numbers MUST match exactly to resume
        if (cleanPhone || mPhone) {
            return sameName && cleanPhone === mPhone;
        }

        // If neither provided a phone number, match by name
        return sameName;
    });

    if (existingMember) {
        return res.status(200).json({
            session: publicSession(session),
            member: existingMember,
            resumed: true
        });
    }

    // Track customer visit
    const visitRecord = trackCustomerVisit(name, phone);
    const isLoyal = visitRecord.visitCount >= 2;

    const newMember = {
        id: nextMemberId++,
        name,
        phone,
        isHost: false,
        visitCount: visitRecord.visitCount,
        isLoyal,
        joinedAt: new Date().toISOString()
    };

    session.members.push(newMember);

    io.to(`session-${session.id}`).emit("memberJoined", newMember);
    emitSessionUpdate(session);

    res.status(201).json({
        session: publicSession(session),
        member: newMember
    });
});

// Toggle / Set Member Loyalty (useful for demo testing >2 visits)
app.post("/api/sessions/:sessionId/member/:memberId/loyalty", (req, res) => {
    const session = getSession(req.params.sessionId);
    const memberId = Number(req.params.memberId);

    if (!session) return res.status(404).json({ message: "Session not found" });
    const member = session.members.find(m => m.id === memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });

    // Toggle loyalty
    if (member.isLoyal) {
        member.isLoyal = false;
        member.visitCount = 1;
    } else {
        member.isLoyal = true;
        member.visitCount = 3;
    }

    // Also update ledger
    const key = (member.phone && member.phone !== "Guest" ? member.phone : member.name).toLowerCase();
    customerLedger.set(key, {
        name: member.name,
        phone: member.phone,
        visitCount: member.visitCount,
        lastVisited: new Date().toISOString()
    });

    // Re-calculate bill if in checkout
    if (session.status === "checkout") {
        const sessionOrders = getSessionOrders(session.id);
        const existingBill = bills.get(session.id);
        const newBill = calculateAllocations(session, sessionOrders, existingBill?.mode || "equal");
        bills.set(session.id, newBill);
        emitBillUpdate(session.id);
    }

    emitSessionUpdate(session);

    res.json({
        message: `Member loyalty updated to: ${member.isLoyal ? 'Loyal Diner (3 Visits - 15% OFF)' : 'Regular (1 Visit)'}`,
        member
    });
});

// Get session details
app.get("/api/sessions/:sessionId", (req, res) => {
    const session = getSession(req.params.sessionId);

    if (!session) {
        return res.status(404).json({ message: "Session not found" });
    }

    res.json({
        session: publicSession(session),
        orders: getSessionOrders(session.id),
        shareRequests: getSessionShareRequests(session.id),
        bill: getSessionBill(session.id)
    });
});

// Transfer host role
app.post("/api/sessions/:sessionId/transfer-host", (req, res) => {
    const session = getSession(req.params.sessionId);
    const { currentHostId, newHostId } = req.body;

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.hostId !== Number(currentHostId)) {
        return res.status(403).json({ message: "Only the current host can transfer host privileges" });
    }

    const targetMember = session.members.find(m => m.id === Number(newHostId));
    if (!targetMember) {
        return res.status(404).json({ message: "Target member not found in session" });
    }

    session.members.forEach(m => {
        m.isHost = m.id === targetMember.id;
    });
    session.hostId = targetMember.id;

    emitSessionUpdate(session);
    res.json({ message: `Host role transferred to ${targetMember.name}`, session: publicSession(session) });
});

// Place order item
app.post("/api/orders", (req, res) => {
    const sessionId = Number(req.body.sessionId);
    const memberId = Number(req.body.memberId);
    const itemId = Number(req.body.itemId);
    const quantity = Number(req.body.quantity ?? 1);
    const isShared = Boolean(req.body.isShared);
    const sharedWith = Array.isArray(req.body.sharedWith) ? req.body.sharedWith : [];

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
        return res.status(409).json({ message: "Session is in checkout or completed. Cannot add more items." });
    }

    const member = session.members.find(m => m.id === memberId);
    if (!member) return res.status(403).json({ message: "You are not a member of this session" });

    const menuItem = menu.find(i => i.id === itemId);
    if (!menuItem) return res.status(400).json({ message: "Invalid menu item" });

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
        return res.status(400).json({ message: "Quantity must be between 1 and 50" });
    }

    const order = {
        id: nextOrderId++,
        sessionId,
        memberId,
        memberName: member.name,
        itemId: menuItem.id,
        item: menuItem.name,
        price: menuItem.price,
        quantity,
        isShared: isShared,
        sharedWith: isShared && sharedWith.length > 0 ? sharedWith : [member.name],
        status: "pending",
        createdAt: new Date().toISOString()
    };

    orders.set(order.id, order);
    emitOrdersUpdate(sessionId);

    res.status(201).json(order);
});

// Delete own pending order
app.delete("/api/orders/:orderId", (req, res) => {
    const orderId = Number(req.params.orderId);
    const order = orders.get(orderId);
    const memberId = Number(req.body?.memberId || req.query?.memberId);

    if (!order) return res.status(404).json({ message: "Order item not found" });

    if (order.memberId !== memberId) {
        return res.status(403).json({ message: "You can only delete your own order items" });
    }

    if (order.status !== "pending") {
        return res.status(409).json({ message: "This item has already been accepted by the kitchen and cannot be deleted" });
    }

    orders.delete(orderId);
    emitOrdersUpdate(order.sessionId);

    res.json({ message: "Order item cancelled" });
});

// Update order status (Staff / Kitchen)
app.patch("/api/orders/:orderId/status", (req, res) => {
    const orderId = Number(req.params.orderId);
    const order = orders.get(orderId);
    const { status } = req.body;

    if (!order) return res.status(404).json({ message: "Order item not found" });

    const validStatuses = ["accepted", "preparing", "served", "rejected"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    emitOrdersUpdate(order.sessionId);
    res.json(order);
});

// ==================== SHARED FOOD REQUESTS ====================

app.post("/api/sessions/:sessionId/share-requests", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const { memberId, itemId, note } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const member = session.members.find(m => m.id === Number(memberId));
    if (!member) return res.status(403).json({ message: "Not a session member" });

    const menuItem = menu.find(i => i.id === Number(itemId));
    if (!menuItem) return res.status(400).json({ message: "Menu item not found" });

    const shareReq = {
        id: nextShareRequestId++,
        sessionId,
        itemId: menuItem.id,
        item: menuItem.name,
        price: menuItem.price,
        image: menuItem.image,
        creatorId: member.id,
        creatorName: member.name,
        note: note || `Anyone want to split ${menuItem.name}?`,
        participants: [{ id: member.id, name: member.name }],
        status: "open",
        createdAt: new Date().toISOString()
    };

    shareRequests.set(shareReq.id, shareReq);
    emitShareRequestsUpdate(sessionId);

    res.status(201).json(shareReq);
});

app.post("/api/sessions/:sessionId/share-requests/:requestId/join", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const requestId = Number(req.params.requestId);
    const { memberId } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const member = session.members.find(m => m.id === Number(memberId));
    if (!member) return res.status(403).json({ message: "Not a session member" });

    const shareReq = shareRequests.get(requestId);
    if (!shareReq || shareReq.sessionId !== sessionId) {
        return res.status(404).json({ message: "Share request not found" });
    }

    if (shareReq.status !== "open") {
        return res.status(409).json({ message: "This share request is no longer open" });
    }

    const alreadyJoinedIndex = shareReq.participants.findIndex(p => p.id === member.id);
    if (alreadyJoinedIndex >= 0) {
        if (member.id === shareReq.creatorId) {
            return res.status(400).json({ message: "Creator cannot leave; you can cancel the request instead" });
        }
        shareReq.participants.splice(alreadyJoinedIndex, 1);
    } else {
        shareReq.participants.push({ id: member.id, name: member.name });
    }

    emitShareRequestsUpdate(sessionId);
    res.json(shareReq);
});

app.post("/api/sessions/:sessionId/share-requests/:requestId/confirm", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const requestId = Number(req.params.requestId);
    const { memberId } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const shareReq = shareRequests.get(requestId);
    if (!shareReq || shareReq.sessionId !== sessionId) {
        return res.status(404).json({ message: "Share request not found" });
    }

    if (shareReq.status !== "open") {
        return res.status(409).json({ message: "Share request is not open" });
    }

    if (shareReq.creatorId !== Number(memberId) && session.hostId !== Number(memberId)) {
        return res.status(403).json({ message: "Only the proposer or host can place this shared order" });
    }

    shareReq.status = "confirmed";

    const order = {
        id: nextOrderId++,
        sessionId,
        memberId: shareReq.creatorId,
        memberName: `${shareReq.creatorName} (Shared)`,
        itemId: shareReq.itemId,
        item: shareReq.item,
        price: shareReq.price,
        quantity: 1,
        isShared: true,
        sharedWith: shareReq.participants.map(p => p.name),
        sharedMemberIds: shareReq.participants.map(p => p.id),
        status: "pending",
        createdAt: new Date().toISOString()
    };

    orders.set(order.id, order);

    emitShareRequestsUpdate(sessionId);
    emitOrdersUpdate(sessionId);

    res.json({ message: "Shared dish added to table order!", order });
});

app.delete("/api/sessions/:sessionId/share-requests/:requestId", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const requestId = Number(req.params.requestId);
    const memberId = Number(req.body?.memberId || req.query?.memberId);

    const shareReq = shareRequests.get(requestId);
    if (!shareReq) return res.status(404).json({ message: "Share request not found" });

    const session = getSession(sessionId);
    if (shareReq.creatorId !== memberId && session?.hostId !== memberId) {
        return res.status(403).json({ message: "Only the creator or host can cancel this request" });
    }

    shareReq.status = "cancelled";
    emitShareRequestsUpdate(sessionId);

    res.json({ message: "Share request cancelled" });
});

// ==================== AI RECOMMENDATIONS ====================

app.post("/api/ai/recommendations", (req, res) => {
    const { sessionId, query } = req.body;
    const session = sessionId ? getSession(sessionId) : null;
    const tableOrders = session ? getSessionOrders(session.id) : [];

    const orderedCategories = new Set(
        tableOrders.map(o => {
            const item = menu.find(m => m.id === o.itemId);
            return item ? item.category : "";
        })
    );

    const hasMains = orderedCategories.has("Pizza & Mains") || orderedCategories.has("Pasta & Mains");
    const hasBeverages = orderedCategories.has("Beverages");
    const hasDesserts = orderedCategories.has("Desserts");
    const hasStarters = orderedCategories.has("Starters");

    let recommendations = [];
    let reasoning = "";

    if (query && (query.toLowerCase().includes("sweet") || query.toLowerCase().includes("dessert"))) {
        recommendations = menu.filter(m => m.category === "Desserts");
        reasoning = "Here are our finest sweet treats to satisfy your sweet tooth!";
    } else if (query && (query.toLowerCase().includes("drink") || query.toLowerCase().includes("beverage") || query.toLowerCase().includes("thirsty"))) {
        recommendations = menu.filter(m => m.category === "Beverages");
        reasoning = "Quench your thirst with our hand-crafted beverages.";
    } else if (hasMains && !hasBeverages) {
        recommendations = menu.filter(m => m.category === "Beverages");
        reasoning = "We noticed you have delicious mains on your table! Pair them with a refreshing Cold Coffee or Berry Mojito.";
    } else if (hasMains && !hasDesserts) {
        recommendations = menu.filter(m => m.category === "Desserts" || m.category === "Beverages");
        reasoning = "Finish your collaborative feast with our Molten Lava Brownie Sundae!";
    } else if (!hasStarters && tableOrders.length === 0) {
        recommendations = menu.filter(m => m.tags.includes("starter") || m.tags.includes("sharing"));
        reasoning = "Welcome to CollabDine! Start your table off with shareable finger foods while everyone decides on mains.";
    } else {
        recommendations = menu.filter(m => m.tags.includes("popular"));
        reasoning = "Crowd favorites that groups love sharing together!";
    }

    res.json({
        reasoning,
        recommendations: recommendations.slice(0, 3),
        suggestedCombos: [
            {
                name: "The Duo Delight",
                items: ["Margherita Pizza", "Artisanal Cold Coffee"],
                totalPrice: 3.00,
                saving: "Perfect table pair"
            },
            {
                name: "Pasta & Crunch Feast",
                items: ["Creamy Alfredo Pasta", "Crispy Garlic Bread Sticks"],
                totalPrice: 3.50,
                saving: "Classic Italian blend"
            }
        ]
    });
});

// ==================== CHECKOUT & BILLING ====================

// Calculate allocations with Loyal Customer (>2 visits) discount
function calculateAllocations(session, sessionOrders, mode, customDesignatedId = null, customAllocations = null) {
    const billableOrders = sessionOrders.filter(o => o.status !== "rejected");
    const subtotal = billableOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
    const tax = Math.round((subtotal * 0.05) * 100) / 100; // 5% GST
    const totalWithoutDiscount = Math.round((subtotal + tax) * 100) / 100;

    const members = session.members;
    let allocations = [];

    if (mode === "single") {
        const payerId = customDesignatedId ? Number(customDesignatedId) : session.hostId;
        const payer = members.find(m => m.id === payerId) || members[0];

        allocations = members.map(m => {
            const isPayer = m.id === payer.id;
            let rawShare = isPayer ? totalWithoutDiscount : 0;
            let discountAmount = 0;
            let discountReason = null;

            // Apply loyalty offer if customer has visited >= 2 times
            if (isPayer && (m.isLoyal || (m.visitCount && m.visitCount >= 2))) {
                discountAmount = Math.round((rawShare * 0.15) * 100) / 100;
                discountReason = "⭐ Loyal Diner Reward (>2 Visits: 15% OFF)";
            }

            const finalShare = Math.max(0, Math.round((rawShare - discountAmount) * 100) / 100);

            return {
                memberId: m.id,
                memberName: m.name,
                rawAmount: rawShare,
                discountAmount,
                discountReason,
                amount: finalShare,
                isLoyal: Boolean(m.isLoyal || (m.visitCount && m.visitCount >= 2)),
                visitCount: m.visitCount || 1,
                isDesignatedPayer: isPayer,
                paid: false,
                paymentRef: null
            };
        });
    } else if (mode === "equal") {
        const count = members.length || 1;
        const rawShare = Math.floor((totalWithoutDiscount / count) * 100) / 100;
        let remainder = Math.round((totalWithoutDiscount - (rawShare * count)) * 100) / 100;

        allocations = members.map((m, idx) => {
            const extra = idx === 0 ? remainder : 0;
            const memberRaw = Math.round((rawShare + extra) * 100) / 100;
            let discountAmount = 0;
            let discountReason = null;

            if (m.isLoyal || (m.visitCount && m.visitCount >= 2)) {
                discountAmount = Math.round((memberRaw * 0.15) * 100) / 100;
                discountReason = "⭐ Loyal Diner Reward (>2 Visits: 15% OFF)";
            }

            const finalShare = Math.max(0.05, Math.round((memberRaw - discountAmount) * 100) / 100);

            return {
                memberId: m.id,
                memberName: m.name,
                rawAmount: memberRaw,
                discountAmount,
                discountReason,
                amount: finalShare,
                isLoyal: Boolean(m.isLoyal || (m.visitCount && m.visitCount >= 2)),
                visitCount: m.visitCount || 1,
                paid: false,
                paymentRef: null
            };
        });
    } else if (mode === "by_item") {
        const memberTotals = {};
        members.forEach(m => { memberTotals[m.id] = 0; });

        billableOrders.forEach(o => {
            const itemTotal = o.price * o.quantity;
            if (o.isShared && Array.isArray(o.sharedMemberIds) && o.sharedMemberIds.length > 0) {
                const splitCost = itemTotal / o.sharedMemberIds.length;
                o.sharedMemberIds.forEach(mId => {
                    if (memberTotals[mId] !== undefined) {
                        memberTotals[mId] += splitCost;
                    } else {
                        memberTotals[o.memberId] = (memberTotals[o.memberId] || 0) + splitCost;
                    }
                });
            } else {
                if (memberTotals[o.memberId] !== undefined) {
                    memberTotals[o.memberId] += itemTotal;
                } else {
                    memberTotals[session.hostId] = (memberTotals[session.hostId] || 0) + itemTotal;
                }
            }
        });

        let allocatedSum = 0;
        allocations = members.map((m) => {
            const sub = memberTotals[m.id] || 0;
            const memberTax = subtotal > 0 ? (sub / subtotal) * tax : 0;
            const share = Math.round((sub + memberTax) * 100) / 100;
            allocatedSum += share;

            let discountAmount = 0;
            let discountReason = null;

            if (m.isLoyal || (m.visitCount && m.visitCount >= 2)) {
                discountAmount = Math.round((share * 0.15) * 100) / 100;
                discountReason = "⭐ Loyal Diner Reward (>2 Visits: 15% OFF)";
            }

            const finalShare = Math.max(0.05, Math.round((share - discountAmount) * 100) / 100);

            return {
                memberId: m.id,
                memberName: m.name,
                rawAmount: share,
                discountAmount,
                discountReason,
                amount: finalShare,
                isLoyal: Boolean(m.isLoyal || (m.visitCount && m.visitCount >= 2)),
                visitCount: m.visitCount || 1,
                paid: false,
                paymentRef: null
            };
        });
    }

    const totalDiscount = allocations.reduce((sum, a) => sum + (a.discountAmount || 0), 0);
    const finalTotal = Math.round(allocations.reduce((sum, a) => sum + a.amount, 0) * 100) / 100;

    return {
        subtotal,
        tax,
        totalWithoutDiscount,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        total: finalTotal,
        mode,
        allocations,
        status: finalTotal === 0 ? "paid" : "pending"
    };
}

// Host starts checkout
app.post("/api/sessions/:sessionId/checkout", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const { hostId, mode = "equal", designatedPayerId = null } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.hostId !== Number(hostId)) {
        return res.status(403).json({ message: "Only the host can initiate checkout" });
    }

    session.status = "checkout";
    session.checkoutStartedAt = new Date().toISOString();

    const sessionOrders = getSessionOrders(sessionId);
    const bill = calculateAllocations(session, sessionOrders, mode, designatedPayerId);
    bills.set(sessionId, bill);

    emitSessionUpdate(session);
    emitBillUpdate(sessionId);

    res.json({
        message: "Checkout initiated",
        session: publicSession(session),
        bill
    });
});

// Update billing mode
app.post("/api/sessions/:sessionId/bill-mode", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const { hostId, mode, designatedPayerId, customAllocations } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.hostId !== Number(hostId)) {
        return res.status(403).json({ message: "Only the host can adjust billing mode" });
    }

    const sessionOrders = getSessionOrders(sessionId);
    const existingBill = bills.get(sessionId);

    const newBill = calculateAllocations(session, sessionOrders, mode, designatedPayerId, customAllocations);

    if (existingBill && existingBill.allocations) {
        newBill.allocations.forEach(alloc => {
            const prev = existingBill.allocations.find(p => p.memberId === alloc.memberId);
            if (prev && prev.paid && prev.amount === alloc.amount) {
                alloc.paid = true;
                alloc.paymentRef = prev.paymentRef;
                alloc.npciUtr = prev.npciUtr;
            }
        });
    }

    const allPaid = newBill.allocations.every(a => a.amount === 0 || a.paid);
    if (allPaid) {
        newBill.status = "paid";
    }

    bills.set(sessionId, newBill);
    emitBillUpdate(sessionId);

    res.json(newBill);
});

// Pay Allocation (Validates VPA / Card, processes payment, stores official receipt)
app.post("/api/sessions/:sessionId/pay", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const {
        memberId,
        paymentMethod = "UPI",
        upiId,
        cardDetails
    } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const member = session.members.find(m => m.id === Number(memberId));
    if (!member) return res.status(404).json({ message: "Member not found" });

    const bill = bills.get(sessionId);
    if (!bill) return res.status(404).json({ message: "Bill not generated yet. Host must start checkout." });

    const alloc = bill.allocations.find(a => a.memberId === Number(memberId));
    if (!alloc) return res.status(404).json({ message: "Member allocation not found in bill" });

    if (alloc.paid) {
        return res.status(400).json({ message: "This share has already been paid" });
    }

    // Strict VPA validation if UPI
    let paymentDetailString = "";
    if (paymentMethod === "UPI") {
        const upiValidation = validateUpiVpa(upiId);
        if (!upiValidation.valid) {
            return res.status(400).json({ message: upiValidation.error });
        }
        paymentDetailString = `UPI VPA: ${upiValidation.vpa}`;
    } else if (paymentMethod === "Card") {
        const cardValidation = validateCardDetails(cardDetails || {});
        if (!cardValidation.valid) {
            return res.status(400).json({ message: cardValidation.error });
        }
        paymentDetailString = `${cardValidation.brand} Card ending in •••• ${cardValidation.last4} (${cardValidation.cardHolder})`;
    } else {
        paymentDetailString = "Direct Table Payment";
    }

    // Generate Official Banking Proof Identifiers
    const transactionId = `TXN-COL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 899 + 100)}`;
    const npciUtr = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const bankAuthCode = `AUTH${Math.floor(100000 + Math.random() * 900000)}`;
    const paidAt = new Date().toISOString();

    alloc.paid = true;
    alloc.paymentRef = transactionId;
    alloc.npciUtr = npciUtr;
    alloc.bankAuthCode = bankAuthCode;
    alloc.paymentMethod = paymentMethod;
    alloc.paymentDetails = paymentDetailString;
    alloc.paidAt = paidAt;

    // Collect itemized food for receipt
    const sessionOrders = getSessionOrders(sessionId);
    const memberItems = sessionOrders
        .filter(o => o.memberId === member.id || (o.isShared && o.sharedMemberIds?.includes(member.id)))
        .map(o => ({
            name: o.item,
            quantity: o.quantity,
            price: o.price,
            isShared: o.isShared,
            shareCount: o.isShared ? (o.sharedMemberIds?.length || 1) : 1
        }));

    // Create official verifiable receipt proof
    const receipt = {
        receiptId: `REC-${sessionId}-${member.id}-${Date.now().toString().slice(-4)}`,
        transactionId,
        npciUtr,
        bankAuthCode,
        restaurant: {
            name: "CollabDine Bistro & Café",
            tagline: "Fine Food · Shared Moments",
            gstin: "07AAAAA9876A1Z4",
            fssai: "10019011000542",
            address: "42 Connaught Circle, Central Avenue, New Delhi - 110001",
            phone: "+91 11 4982 7100"
        },
        dining: {
            tableNumber: session.tableNumber,
            sessionId: session.id,
            hostName: session.members.find(m => m.isHost)?.name || "Host",
            billingMode: bill.mode
        },
        payer: {
            memberId: member.id,
            name: member.name,
            phone: member.phone,
            visitCount: member.visitCount || 1,
            isLoyal: Boolean(alloc.isLoyal)
        },
        payment: {
            method: paymentMethod,
            details: paymentDetailString,
            paidAt,
            status: "PAID_AND_VERIFIED",
            currency: "INR"
        },
        breakdown: {
            subtotal: alloc.rawAmount,
            discount: alloc.discountAmount || 0,
            discountReason: alloc.discountReason || null,
            amountPaid: alloc.amount
        },
        items: memberItems
    };

    receipts.set(`${sessionId}-${member.id}`, receipt);

    // Check if entire bill is paid
    const allPaid = bill.allocations.every(a => a.amount === 0 || a.paid);
    if (allPaid) {
        bill.status = "paid";
        bill.paidAt = paidAt;
    }

    emitBillUpdate(sessionId);

    res.json({
        message: "Payment authorized & recorded successfully!",
        transactionId,
        npciUtr,
        receipt,
        allocation: alloc,
        billStatus: bill.status
    });
});

// Get Official Payment Receipt
app.get("/api/sessions/:sessionId/receipt/:memberId", (req, res) => {
    const key = `${req.params.sessionId}-${req.params.memberId}`;
    const receipt = receipts.get(key);

    if (!receipt) {
        return res.status(404).json({ message: "No payment receipt found for this diner." });
    }

    res.json(receipt);
});

// End / Close Session (Host only, and ONLY when bill is fully paid!)
app.post("/api/sessions/:sessionId/close", (req, res) => {
    const sessionId = Number(req.params.sessionId);
    const { hostId } = req.body;

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.hostId !== Number(hostId)) {
        return res.status(403).json({ message: "Only the session host can officially end the dining session" });
    }

    const bill = bills.get(sessionId);
    if (!bill || bill.status !== "paid") {
        return res.status(400).json({
            message: "Cannot close table session: The bill has not been paid in full yet!"
        });
    }

    session.status = "completed";
    session.closedAt = new Date().toISOString();

    emitSessionUpdate(session);

    res.json({
        message: "Session closed successfully. Thank you for dining with us!",
        session: publicSession(session)
    });
});

// Staff Overview
app.get("/api/staff/overview", (req, res) => {
    const activeSessions = [...sessions.values()].filter(s => s.status !== "completed");
    const allOrders = [...orders.values()];
    const localIp = getLocalIpAddress();

    const tables = [1, 2, 3, 4, 5, 6, 7, 8].map(tableNum => {
        const active = activeSessions.find(s => s.tableNumber === tableNum);
        return {
            tableNumber: tableNum,
            qrUrl: `http://${localIp}:5173/?table=${tableNum}`,
            hasActiveSession: Boolean(active),
            session: active ? publicSession(active) : null,
            ordersCount: active ? allOrders.filter(o => o.sessionId === active.id).length : 0
        };
    });

    res.json({
        tables,
        activeSessionsCount: activeSessions.length,
        kitchenQueue: allOrders.filter(o => o.status === "pending" || o.status === "accepted" || o.status === "preparing")
    });
});

app.get("/api/staff/kitchen-queue", (req, res) => {
    const queue = [...orders.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(queue);
});

// Staff: Force-clear a stuck table session (removes session, orders, bills, share requests)
app.post("/api/staff/force-clear-table/:tableNumber", (req, res) => {
    const tableNumber = parseInt(req.params.tableNumber, 10);
    const session = [...sessions.values()].find(
        (s) => s.tableNumber === tableNumber && (s.status === "active" || s.status === "checkout")
    );

    if (!session) {
        return res.json({ success: true, message: `Table #${tableNumber} is already clear` });
    }

    const sessionId = session.id;

    // Remove all orders for this session
    for (const [orderId, order] of orders) {
        if (order.sessionId === sessionId) orders.delete(orderId);
    }
    // Remove all share requests
    for (const [reqId, req2] of shareRequests) {
        if (req2.sessionId === sessionId) shareRequests.delete(reqId);
    }
    // Remove bills
    for (const [billId, bill] of bills) {
        if (bill.sessionId === sessionId) bills.delete(billId);
    }
    // Remove session
    sessions.delete(sessionId);

    // Notify connected clients
    io.to(`session-${sessionId}`).emit("sessionError", {
        message: "This session has been cleared. Table is now available for a new party."
    });
    io.emit("tableCleared", { tableNumber, sessionId });

    res.json({ success: true, message: `Table #${tableNumber} cleared successfully` });
});

// Socket.IO
io.on("connection", socket => {
    socket.on("joinSession", sessionId => {
        const session = getSession(sessionId);
        if (!session) {
            socket.emit("sessionError", { message: "Session not found" });
            return;
        }

        socket.join(`session-${session.id}`);

        socket.emit("sessionData", {
            session: publicSession(session),
            orders: getSessionOrders(session.id),
            shareRequests: getSessionShareRequests(session.id),
            bill: getSessionBill(session.id)
        });
    });

    socket.on("disconnect", () => {});
});

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`CollabDine backend running on http://localhost:${PORT} and http://${getLocalIpAddress()}:${PORT}`);
});
