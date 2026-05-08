// ================= CREATE DEVICE API =================

const Device = require("../model/deviceModel");

// ================= CREATE DEVICE =================
const createDevice = async (req, res) => {

    try {

        const {
            deviceId
        } = req.body;

        // ================= VALIDATIONS =================
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: "Device ID is required"
            });
        }

        // ================= CHECK EXIST =================
        const existingDevice = await Device.findOne({ deviceId });

        if (existingDevice) {
            return res.status(400).json({
                success: false,
                message: "Device already exists"
            });
        }

        // ================= CREATE DEVICE =================
        const device = await Device.create({
            deviceId,
            temperature: null,
            humidity: null,
            powerStatus: "OFF",
            connectionStatus: "OFFLINE",
            lastUpdateTime: null
        });

        return res.status(201).json({
            success: true,
            message: "Device created successfully",
            device
        });

    } catch (error) {

        console.log("CREATE DEVICE ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// ================= GET ALL DEVICES =================
const getAllDevices = async (req, res) => {

    try {

        const devices = await Device.find().sort({ createdAt: -1 });

        if (!devices) {
            return res.status(404).json({ message: "no devices found" })
        }

        return res.status(200).json({
            success: true,
            totalDevices: devices.length,
            devices
        });

    } catch (error) {

        console.log("GET DEVICES ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    createDevice,
    getAllDevices
};