const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
    {
        // ================= IDENTIFIER =================
        deviceId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        // ================= SENSOR DATA =================
        temperature: {
            type: Number,
            default: null
        },

        humidity: {
            type: Number,
            default: null
        },

        // ================= DEVICE CONTROL STATUS =================
        powerStatus: {
            type: String,
            enum: ["ON", "OFF"],
            default: "OFF"
        },

        // ================= CONNECTIVITY STATUS =================
        connectionStatus: {
            type: String,
            enum: ["ONLINE", "OFFLINE"],
            default: "OFFLINE"
        },

        // ================= LAST UPDATE =================
        lastUpdateTime: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

deviceModel = mongoose.model("Device", deviceSchema);

module.exports = deviceModel;