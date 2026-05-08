const mqtt = require("mqtt");

// const client = mqtt.connect("mqtt://localhost:1883");

const client = mqtt.connect("mqtt://testmqtt.iotfiysolutions.com", {
    port: 1883,
    username: "mqttuser",
    password: "YOUR_PASSWORD"
});

module.exports = client;