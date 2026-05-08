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

const connectedDevices = new Map();

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

    // ================= MQTT MESSAGE HANDLER =================
    client.on("message", async (topic, message) => {
        try {
            const rawMessage = message.toString();
            console.log(`\n📩 TOPIC: ${topic}`);

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
            if (!deviceExists) {
                console.log(`❌ Device not found: ${deviceId}`);
                return;
            }

            // ================= UPDATE LAST SEEN =================
            connectedDevices.set(deviceId, { lastSeen: Date.now() });

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

    // ================= AUTO OFFLINE (OPTIMIZED) =================
    setInterval(async () => {
        const now = Date.now();

        for (const [deviceId, data] of connectedDevices) {

            const lastSeen = data.lastSeen;

            // ⚡ Faster timeout (12 seconds instead of 35s)
            if (now - lastSeen > 12000) {

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
                    console.log(`📴 DEVICE OFFLINE → ${deviceId}`);
                }

                connectedDevices.delete(deviceId);
            }
        }
    }, 3000); // ⚡ Faster check interval (was 10000ms)
};