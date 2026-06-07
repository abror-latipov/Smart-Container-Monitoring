const net = require("net");

const host = process.argv[2] || "16.171.206.168";
const port = Number(process.argv[3] || 1883);
const topic = process.argv[4];
const payloadText = process.argv[5];

if (!topic || !payloadText) {
  console.log("Usage:");
  console.log("  node scratch/mqtt_publish.js <host> <port> <topic> '<json payload>'");
  process.exit(1);
}

function encodeLength(value) {
  const encoded = [];
  do {
    let digit = value % 128;
    value = Math.floor(value / 128);
    if (value > 0) digit |= 128;
    encoded.push(digit);
  } while (value > 0);
  return Buffer.from(encoded);
}

function mqttString(value) {
  const body = Buffer.from(value);
  return Buffer.concat([
    Buffer.from([body.length >> 8, body.length & 255]),
    body,
  ]);
}

function mqttPacket(type, body) {
  return Buffer.concat([Buffer.from([type]), encodeLength(body.length), body]);
}

function connectPacket(clientId) {
  const variableHeader = Buffer.concat([
    mqttString("MQTT"),
    Buffer.from([4, 2, 0, 60]),
  ]);
  return mqttPacket(0x10, Buffer.concat([variableHeader, mqttString(clientId)]));
}

function publishPacket(topicName, payload) {
  return mqttPacket(0x30, Buffer.concat([mqttString(topicName), Buffer.from(payload)]));
}

const clientId = `codex-publish-${Math.random().toString(16).slice(2)}`;
const socket = net.createConnection({ host, port, timeout: 10000 }, () => {
  socket.write(connectPacket(clientId));
});

socket.on("data", (buffer) => {
  if ((buffer[0] >> 4) === 2) {
    socket.write(publishPacket(topic, payloadText));
    console.log(`Published to ${topic}: ${payloadText}`);
    socket.end();
  }
});

socket.on("timeout", () => {
  console.log("Publish timed out");
  socket.destroy();
  process.exitCode = 1;
});

socket.on("error", (error) => {
  console.log(`Publish error: ${error.message}`);
  process.exitCode = 1;
});
