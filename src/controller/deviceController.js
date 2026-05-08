// // ================= CREATE DEVICE API =================

// const Device = require("../model/deviceModel");

// // ================= CREATE DEVICE =================
// const createDevice = async (req, res) => {

//     try {

//         const {
//             deviceId
//         } = req.body;

//         // ================= VALIDATIONS =================
//         if (!deviceId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Device ID is required"
//             });
//         }

//         // ================= CHECK EXIST =================
//         const existingDevice = await Device.findOne({ deviceId });

//         if (existingDevice) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Device already exists"
//             });
//         }

//         // ================= CREATE DEVICE =================
//         const device = await Device.create({
//             deviceId,
//             temperature: null,
//             humidity: null,
//             powerStatus: "OFF",
//             connectionStatus: "OFFLINE",
//             lastUpdateTime: null
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Device created successfully",
//             device
//         });

//     } catch (error) {

//         console.log("CREATE DEVICE ERROR:", error.message);

//         return res.status(500).json({
//             success: false,
//             message: "Internal server error"
//         });
//     }
// };

// // ================= GET ALL DEVICES =================
// const getAllDevices = async (req, res) => {

//     try {

//         const devices = await Device.find().sort({ createdAt: -1 });

//         if (!devices) {
//             return res.status(404).json({ message: "no devices found" })
//         }

//         return res.status(200).json({
//             success: true,
//             totalDevices: devices.length,
//             devices
//         });

//     } catch (error) {

//         console.log("GET DEVICES ERROR:", error.message);

//         return res.status(500).json({
//             success: false,
//             message: "Internal server error"
//         });
//     }
// };

// module.exports = {
//     createDevice,
//     getAllDevices
// };


const Device = require("../model/deviceModel");
const client = require("../config/mqttClient");

// ================= CREATE DEVICE =================
const createDevice = async (req, res) => {
    try {
        const { deviceId, name } = req.body;

        if (!deviceId) {
            return res.status(400).json({ success: false, message: "Device ID is required" });
        }

        const existingDevice = await Device.findOne({ deviceId });
        if (existingDevice) {
            return res.status(400).json({ success: false, message: "Device already exists" });
        }

        const device = await Device.create({
            deviceId,
            name,
            temperature: null,
            humidity: null,
            powerStatus: "OFF",
            connectionStatus: "OFFLINE",
            lastUpdateTime: null
        });

        return res.status(201).json({ success: true, message: "Device created successfully", device });
    } catch (error) {
        console.log("CREATE DEVICE ERROR:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ================= GET ALL DEVICES =================
const getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            totalDevices: devices.length,
            devices
        });
    } catch (error) {
        console.log("GET DEVICES ERROR:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ================= CONTROL POWER (NEW + IMPROVED) =================
const controlPower = async (req, res) => {
    try {
        const { deviceId, powerStatus } = req.body;

        if (!deviceId || !["ON", "OFF"].includes(powerStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid deviceId or powerStatus (ON/OFF only)"
            });
        }

        // Check if device exists
        const device = await Device.findOne({ deviceId });
        if (!device) {
            return res.status(404).json({ success: false, message: "Device not found" });
        }

        // 🔥 NEW CHECK: Don't send command if device is OFFLINE
        if (device.connectionStatus !== "ONLINE") {
            return res.status(400).json({
                success: false,
                message: "Device is OFFLINE. Cannot send command."
            });
        }

        // Publish command to ESP32
        const commandPayload = {
            type: "POWER_CONTROL",
            status: powerStatus,
            timestamp: new Date().toISOString()
        };

        client.publish(
            `devices/${deviceId}/command`,
            JSON.stringify(commandPayload)
        );

        console.log(`📤 POWER COMMAND SENT → ${deviceId} | Power: ${powerStatus}`);

        return res.status(200).json({
            success: true,
            message: `Power ${powerStatus} command sent successfully`,
            deviceId,
            powerStatus
        });

    } catch (error) {
        console.log("CONTROL POWER ERROR:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    createDevice,
    getAllDevices,
    controlPower
};