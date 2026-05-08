const express = require("express");

const router = express.Router();

const {
    createDevice,
    getAllDevices
} = require("../controller/deviceController");

// ================= ROUTES =================
router.post("/create-device", createDevice);

router.get("/all-devices", getAllDevices);

module.exports = router;