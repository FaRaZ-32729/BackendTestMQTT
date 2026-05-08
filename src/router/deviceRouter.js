const express = require("express");

const router = express.Router();

const {
    createDevice,
    getAllDevices,
    controlPower
} = require("../controller/deviceController");

// ================= ROUTES =================
router.post("/create-device", createDevice);

router.post("/control-power", controlPower);

module.exports = router;