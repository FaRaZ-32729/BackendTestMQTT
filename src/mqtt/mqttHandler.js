// const client = require("../config/mqttClient");
// const deviceModel = require("../model/deviceModel");
// const { io } = require("../../server");

// // ================= CONNECTED DEVICES =================
// const connectedDevices = new Map();

// // ================= MQTT CONNECT =================
// client.on("connect", () => {

//     console.log("\n🟢 MQTT CONNECTED");

//     // ================= SUBSCRIBE =================
//     client.subscribe("devices/+/handshake");
//     client.subscribe("devices/+/sensor");
//     client.subscribe("devices/+/ack");
//     client.subscribe("devices/+/heartbeat");
//     client.subscribe("devices/+/status");

//     console.log("📡 MQTT TOPICS SUBSCRIBED\n");
// });

// // ================= MQTT ERROR =================
// client.on("error", (err) => {
//     console.log("❌ MQTT ERROR:", err.message);
// });

// // ================= MQTT RECONNECT =================
// client.on("reconnect", () => {
//     console.log("🔄 MQTT RECONNECTING...");
// });

// // ================= MQTT OFFLINE =================
// client.on("offline", () => {
//     console.log("🔴 MQTT OFFLINE");
// });

// // ================= MQTT MESSAGE =================
// client.on("message", async (topic, message) => {

//     try {

//         // ================= RAW MESSAGE =================
//         const rawMessage = message.toString();

//         console.log("\n======================================");
//         console.log("📩 TOPIC:", topic);
//         console.log("📦 RAW:", rawMessage);

//         let data;

//         // ================= SAFE JSON PARSE =================
//         try {

//             data = JSON.parse(rawMessage);

//         } catch (err) {

//             // ================= HANDLE LWT =================
//             if (rawMessage === "OFFLINE") {

//                 const topicParts = topic.split("/");
//                 const deviceId = topicParts[1];

//                 console.log(`🔴 LWT OFFLINE RECEIVED: ${deviceId}`);

//                 connectedDevices.delete(deviceId);

//                 await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     {
//                         connectionStatus: "OFFLINE",
//                         lastUpdateTime: new Date()
//                     }
//                 );

//                 console.log(`✅ DB UPDATED OFFLINE: ${deviceId}`);

//                 return;
//             }

//             console.log("❌ INVALID JSON");
//             return;
//         }

//         // ================= DEVICE ID =================
//         const deviceId = data.deviceId;

//         if (!deviceId) {
//             console.log("❌ DEVICE ID MISSING");
//             return;
//         }

//         // ================= DEVICE EXISTS CHECK =================
//         const device = await deviceModel.findOne({ deviceId });

//         if (!device) {

//             console.log(`❌ DEVICE NOT FOUND: ${deviceId}`);
//             return;
//         }

//         // ================= UPDATE LAST SEEN =================
//         connectedDevices.set(deviceId, {
//             online: true,
//             lastSeen: Date.now()
//         });

//         // ================= HANDSHAKE =================
//         if (topic.includes("/handshake")) {

//             console.log(`🤝 HANDSHAKE: ${deviceId}`);

//             await deviceModel.findOneAndUpdate(
//                 { deviceId },
//                 {
//                     connectionStatus: "ONLINE",
//                     lastUpdateTime: new Date()
//                 }
//             );

//             console.log(`🟢 DEVICE ONLINE: ${deviceId}`);

//             // ================= SEND AUTH SUCCESS =================
//             client.publish(
//                 `devices/${deviceId}/command`,
//                 JSON.stringify({
//                     type: "AUTH_SUCCESS",
//                     message: "Backend Connected Successfully"
//                 })
//             );

//             console.log("📤 AUTH_SUCCESS SENT");
//         }

//         // ================= SENSOR =================
//         else if (topic.includes("/sensor")) {

//             console.log(`📊 SENSOR DATA: ${deviceId}`);

//             console.log(`🌡 TEMP: ${data.temperature}`);
//             console.log(`💧 HUMIDITY: ${data.humidity}`);

//             await deviceModel.findOneAndUpdate(
//                 { deviceId },
//                 {
//                     temperature: data.temperature,
//                     humidity: data.humidity,
//                     connectionStatus: "ONLINE",
//                     lastUpdateTime: new Date()
//                 },
//                 { new: true }
//             );

//             if (updatedDevice && io) {
//                 io.emit("deviceUpdate", updatedDevice);
//                 console.log(`📡 Socket Broadcast: deviceUpdate → ${deviceId}`);
//             }

//             console.log(`✅ SENSOR UPDATED DB`);
//         }

//         // ================= STATUS =================
//         else if (topic.includes("/status")) {

//             // ignore ONLINE/OFFLINE retained packets
//             if (data.status === "ONLINE" || data.status === "OFFLINE") {

//                 await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     {
//                         connectionStatus: data.status,
//                         lastUpdateTime: new Date()
//                     },
//                     { new: true }
//                 );

//                 if (updatedDevice && io) {
//                     io.emit("deviceUpdate", updatedDevice);
//                 }

//                 console.log(`🌐 CONNECTION STATUS: ${deviceId} → ${data.status}`);
//             }

//             // power ON/OFF
//             else {

//                 await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     {
//                         powerStatus: data.status,
//                         connectionStatus: "ONLINE",
//                         lastUpdateTime: new Date()
//                     }
//                 );

//                 console.log(`🔘 POWER STATUS: ${deviceId} → ${data.status}`);
//             }
//         }

//         // ================= HEARTBEAT =================
//         else if (topic.includes("/heartbeat")) {

//             await deviceModel.findOneAndUpdate(
//                 { deviceId },
//                 {
//                     connectionStatus: "ONLINE",
//                     lastUpdateTime: new Date()
//                 }
//             );

//             console.log(`💓 HEARTBEAT: ${deviceId}`);
//         }

//         // ================= ACK =================
//         else if (topic.includes("/ack")) {

//             console.log(`📥 ACK RECEIVED: ${deviceId}`);

//             if (data.status) {
//                 console.log(`📡 STATUS: ${data.status}`);
//             }

//             console.log(`✅ ACK: ${data.ack}`);
//         }

//         console.log("======================================\n");

//     } catch (err) {

//         console.log("❌ MQTT HANDLER ERROR:", err.message);
//     }
// });

// // ================= OFFLINE CHECK =================
// setInterval(async () => {

//     try {

//         const now = Date.now();

//         for (const [deviceId, device] of connectedDevices) {

//             const diff = now - device.lastSeen;

//             // ================= 20 SEC TIMEOUT =================
//             if (diff > 20000) {

//                 console.log(`🔴 DEVICE OFFLINE TIMEOUT: ${deviceId}`);

//                 connectedDevices.delete(deviceId);

//                 await deviceModel.findOneAndUpdate(
//                     { deviceId },
//                     {
//                         connectionStatus: "OFFLINE",
//                         lastUpdateTime: new Date()
//                     }
//                 );

//                 console.log(`✅ DB UPDATED OFFLINE: ${deviceId}`);
//             }
//         }

//     } catch (err) {

//         console.log("❌ OFFLINE CHECK ERROR:", err.message);
//     }

// }, 5000);

// // ================= SHOW CONNECTED DEVICES =================
// setInterval(() => {

//     console.log("\n========== CONNECTED DEVICES ==========");

//     if (connectedDevices.size === 0) {

//         console.log("❌ NO DEVICES CONNECTED");
//     }

//     for (const [deviceId, device] of connectedDevices) {

//         console.log(`🟢 ${deviceId}`);
//         console.log(`⏱ LAST SEEN: ${new Date(device.lastSeen).toLocaleString()}`);
//     }

//     console.log("=======================================\n");

// }, 15000);






const client = require("../config/mqttClient");
const deviceModel = require("../model/deviceModel");

const connectedDevices = new Map();

module.exports = (io) => {

    client.on("connect", () => {
        console.log("\n🟢 MQTT Broker Connected");
        client.subscribe("devices/+/handshake");
        client.subscribe("devices/+/sensor");
        client.subscribe("devices/+/status");
        client.subscribe("devices/+/ack");
        client.subscribe("devices/+/heartbeat");
        console.log("📡 Subscribed to all topics\n");
    });

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

            connectedDevices.set(deviceId, { lastSeen: Date.now() });

            let updatedDevice = null;

            if (topic.includes("/handshake")) {
                updatedDevice = await deviceModel.findOneAndUpdate(
                    { deviceId },
                    { connectionStatus: "ONLINE", lastUpdateTime: new Date() },
                    { new: true }
                );
            }
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
            else if (topic.includes("/status")) {
                const status = (data.status || "").toUpperCase();
                updatedDevice = await deviceModel.findOneAndUpdate(
                    { deviceId },
                    {
                        connectionStatus: status === "ONLINE" || status === "OFFLINE" ? status : "ONLINE",
                        powerStatus: status !== "ONLINE" && status !== "OFFLINE" ? status : undefined,
                        lastUpdateTime: new Date()
                    },
                    { new: true }
                );
            }

            // Broadcast to Frontend
            if (updatedDevice && io) {
                io.emit("deviceUpdate", updatedDevice);
                console.log(`📡 BROADCAST SENT → ${deviceId}`);
            }

        } catch (err) {
            console.log("❌ MQTT Handler Error:", err.message);
        }
    });

    // Auto Offline
    setInterval(async () => {
        const now = Date.now();
        for (const [deviceId] of connectedDevices) {
            if (now - connectedDevices.get(deviceId).lastSeen > 35000) {
                const updatedDevice = await deviceModel.findOneAndUpdate(
                    { deviceId },
                    { connectionStatus: "OFFLINE", lastUpdateTime: new Date() },
                    { new: true }
                );
                if (updatedDevice && io) io.emit("deviceUpdate", updatedDevice);
                connectedDevices.delete(deviceId);
            }
        }
    }, 10000);
};