// const express = require("express");
// const dotenv = require("dotenv");
// const dbConnection = require("./src/config/dbConnection");
// const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const client = require("./src/config/mqttClient");
// const deviceRouter = require("./src/router/deviceRouter");
// const { Server } = require("socket.io");
// const http = require("http");
// require("./src/mqtt/mqttHandler");



// dotenv.config();
// dbConnection();

// const port = process.env.PORT || 6008;
// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: {
//         origin: ["http://localhost:5173", "https://luckyone-iotfiysolutions.vercel.app"],
//         credentials: true
//     },
//     pingTimeout: 60000,
//     pingInterval: 25000,
//     transports: ['websocket', 'polling']
// });

// // Middlewares
// const allowedOrigins = [
//     "https://luckyone-iotfiysolutions.vercel.app",
//     "http://localhost:5173"
// ];

// app.use(cors({
//     origin: function (origin, callback) {
//         if (!origin) return callback(null, true);
//         if (allowedOrigins.includes(origin)) {
//             callback(null, true);
//         } else {
//             callback(new Error("Not allowed by CORS"));
//         }
//     },
//     credentials: true
// }));


// app.use(express.json());
// app.use(cookieParser());


// // Make io accessible globally
// app.set('io', io);

// // Socket.io Connection
// io.on("connection", (socket) => {
//     console.log("🟢 New Client Connected:", socket.id);

//     socket.on("disconnect", () => {
//         console.log("🔴 Client Disconnected:", socket.id);
//     });
// });

// // Routes
// app.use("/device", deviceRouter);

// app.get("/", (req, res) => {
//     res.send("Hellow FaRaZ to IOTFIY-LuckyOne");
// });


// // mqqt
// client.on("message", (topic, message) => {
//     const data = JSON.parse(message.toString());

//     console.log("Topic:", topic);
//     console.log("Data:", data);
// });


// // Start server
// app.listen(port, () => {
//     console.log(`Express & WebSocket is running on port : ${port}`);
// })

// // Export io for use in mqttHandler
// module.exports = { io };




const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const dbConnection = require("./src/config/dbConnection");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const client = require("./src/config/mqttClient");
const deviceRouter = require("./src/router/deviceRouter");

dotenv.config();
dbConnection();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://luckyone-iotfiysolutions.vercel.app"],
        credentials: true
    },
    pingTimeout: 90000,
    pingInterval: 30000,
    transports: ['polling', 'websocket']
});

// Middlewares
app.use(cors({ origin: true, credentials: true })); // Simplified for dev
app.use(express.json());
app.use(cookieParser());

app.set('io', io);

// Socket Connection Log
io.on("connection", (socket) => {
    console.log("🟢 New Client Connected:", socket.id);
});

// Routes
app.use("/device", deviceRouter);

app.get("/", (req, res) => {
    res.send("Hello FaRaZ to test-MQTT");
});

// Start Server
const port = process.env.PORT || 6008;
server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server + Socket.io running on http://localhost:${port}`);
});

// Pass io to mqttHandler
const mqttHandler = require("./src/mqtt/mqttHandler");
mqttHandler(io);   // ← Pass io here