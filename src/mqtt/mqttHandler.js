// const client = require("../config/mqttClient");
// const deviceModel = require("../model/deviceModel");

// const connectedDevices = new Map();

// module.exports = (io) => {

//     client.on("connect", () => {
//         console.log("\n🟢 MQTT Broker Connected");
//         client.subscribe("devices/+/handshake");
//         client.subscribe("devices/+/sensor");
//         client.subscribe("devices/+/status");
//         client.subscribe("devices/+/ack");
//         client.subscribe("devices/+/heartbeat");
//         console.log("📡 Subscribed to all topics\n");
//     });

//     client.on("message", async (topic, message) => {
//         try {
//             const rawMessage = message.toString();
//             console.log(`\n📩 TOPIC: ${topic}`);

//             let data;
//             try {
//                 data = JSON.parse(rawMessage);
//             } catch (err) {
//                 console.log("❌ Invalid JSON");
//                 return;
//             }

//             const deviceId = data.deviceId;
//             if (!deviceId) return;

//             const deviceExists = await deviceModel.findOne({ deviceId });
//             if (!deviceExists) {
//                 console.log(`❌ Device not found: ${deviceId}`);
//                 return;
//             }

//             connectedDevices.set(deviceId, { lastSeen: Date.now() });

//             let updatedDevice = null;

//             if (topic.includes("/handshake")) {
//                 updatedDevice = await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     { connectionStatus: "ONLINE", lastUpdateTime: new Date() },
//                     { new: true }
//                 );
//             }
//             else if (topic.includes("/sensor")) {
//                 console.log(`🌡️ ${data.temperature}°C | 💧 ${data.humidity}%`);

//                 updatedDevice = await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     {
//                         temperature: data.temperature,
//                         humidity: data.humidity,
//                         connectionStatus: "ONLINE",
//                         lastUpdateTime: new Date()
//                     },
//                     { new: true }
//                 );
//             }
//             else if (topic.includes("/status")) {
//                 const status = (data.status || "").toUpperCase();
//                 updatedDevice = await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     {
//                         connectionStatus: status === "ONLINE" || status === "OFFLINE" ? status : "ONLINE",
//                         powerStatus: status !== "ONLINE" && status !== "OFFLINE" ? status : undefined,
//                         lastUpdateTime: new Date()
//                     },
//                     { new: true }
//                 );
//             }

//             // Broadcast to Frontend
//             if (updatedDevice && io) {
//                 io.emit("deviceUpdate", updatedDevice);
//                 console.log(`📡 BROADCAST SENT → ${deviceId}`);
//             }

//         } catch (err) {
//             console.log("❌ MQTT Handler Error:", err.message);
//         }
//     });

//     // Auto Offline
//     setInterval(async () => {
//         const now = Date.now();
//         for (const [deviceId] of connectedDevices) {
//             if (now - connectedDevices.get(deviceId).lastSeen > 35000) {
//                 const updatedDevice = await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     { connectionStatus: "OFFLINE", lastUpdateTime: new Date() },
//                     { new: true }
//                 );
//                 if (updatedDevice && io) io.emit("deviceUpdate", updatedDevice);
//                 connectedDevices.delete(deviceId);
//             }
//         }
//     }, 10000);
// };

const client = require("../config/mqttClient");
const deviceModel = require("../model/deviceModel");

// ================= DEVICE TRACKING =================
const connectedDevices = new Map();

/*
Structure:
deviceId => {
  lastSeen: timestamp,
  missedHeartbeats: number
}
*/

module.exports = (io) => {

    // ================= MQTT CONNECT =================
    client.on("connect", () => {
        console.log("\n🟢 MQTT Broker Connected");

        client.subscribe("devices/+/handshake");
        client.subscribe("devices/+/sensor");
        client.subscribe("devices/+/status");
        client.subscribe("devices/+/ack");
        client.subscribe("devices/+/heartbeat");

        console.log("📡 Subscribed to all topics\n");
    });

    // ================= MQTT MESSAGE =================
    client.on("message", async (topic, message) => {
        try {
            const rawMessage = message.toString();
            let data;

            try {
                data = JSON.parse(rawMessage);
            } catch (err) {
                console.log("❌ Invalid JSON");
                return;
            }

            const deviceId = data.deviceId;
            if (!deviceId) return;

            const deviceExists = await deviceModel.findOne({ deviceId });
            if (!deviceExists) return;

            // ================= INIT DEVICE TRACKING =================
            if (!connectedDevices.has(deviceId)) {
                connectedDevices.set(deviceId, {
                    lastSeen: Date.now(),
                    missedHeartbeats: 0
                });
            }

            const deviceState = connectedDevices.get(deviceId);

            // ================= HEARTBEAT =================
            if (topic.includes("/heartbeat")) {
                deviceState.lastSeen = Date.now();
                deviceState.missedHeartbeats = 0;

                console.log(`💓 HEARTBEAT → ${deviceId}`);
                return;
            }

            // update lastSeen for all messages
            deviceState.lastSeen = Date.now();

            let updatedDevice = null;

            // ================= HANDSHAKE =================
            if (topic.includes("/handshake")) {
                updatedDevice = await deviceModel.findOneAndUpdate(
                    { deviceId },
                    { connectionStatus: "ONLINE", lastUpdateTime: new Date() },
                    { new: true }
                );
            }

            // ================= SENSOR =================
            else if (topic.includes("/sensor")) {
                console.log(`🌡️ ${data.temperature}°C | 💧 ${data.humidity}%`);

                updatedDevice = await deviceModel.findOneAndUpdate(
                    { deviceId },
                    {
                        temperature: data.temperature,
                        humidity: data.humidity,
                        connectionStatus: "ONLINE",
                        lastUpdateTime: new Date()
                    },
                    { new: true }
                );
            }

            // ================= STATUS =================
            else if (topic.includes("/status")) {
                const status = (data.status || "").toUpperCase();

                updatedDevice = await deviceModel.findOneAndUpdate(
                    { deviceId },
                    {
                        connectionStatus:
                            status === "ONLINE" || status === "OFFLINE"
                                ? status
                                : "ONLINE",
                        powerStatus:
                            status !== "ONLINE" && status !== "OFFLINE"
                                ? status
                                : undefined,
                        lastUpdateTime: new Date()
                    },
                    { new: true }
                );
            }

            // ================= BROADCAST =================
            if (updatedDevice && io) {
                io.emit("deviceUpdate", updatedDevice);
                console.log(`📡 BROADCAST SENT → ${deviceId}`);
            }

        } catch (err) {
            console.log("❌ MQTT Handler Error:", err.message);
        }
    });

    // ================= HEARTBEAT MONITOR =================
    setInterval(async () => {

        const now = Date.now();

        for (const [deviceId, state] of connectedDevices) {

            const timeDiff = now - state.lastSeen;

            // if no heartbeat in last 6 seconds → increase miss
            if (timeDiff > 6000) {
                state.missedHeartbeats += 1;
                state.lastSeen = now; // prevent repeated spam logs
            }

            // ================= OFFLINE AFTER 2 MISSES =================
            if (state.missedHeartbeats >= 2) {

                const updatedDevice = await deviceModel.findOneAndUpdate(
                    { deviceId },
                    {
                        connectionStatus: "OFFLINE",
                        lastUpdateTime: new Date()
                    },
                    { new: true }
                );

                if (updatedDevice && io) {
                    io.emit("deviceUpdate", updatedDevice);
                    console.log(`📴 DEVICE OFFLINE (HEARTBEAT LOST) → ${deviceId}`);
                }

                connectedDevices.delete(deviceId);
            }
        }

    }, 3000); // fast check every 3 sec
};