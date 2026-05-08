const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883");

module.exports = client;