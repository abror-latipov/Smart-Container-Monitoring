const http = require("http");
const net = require("net");

const mqttHost = process.argv[2] || "16.171.206.168";
const mqttPort = Number(process.argv[3] || 1883);
const backendUrl = process.argv[4] || "http://localhost:8000/api/containers/1/settings";
const topic = "bunker/001/setTemp";

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
  return Buffer.concat([Buffer.from([body.length >> 8, body.length & 255]), body]);
}

function mqttPacket(type, body) {
  return Buffer.concat([Buffer.from([type]), encodeLength(body.length), body]);
}

function connectPacket(clientId) {
  return mqttPacket(0x10, Buffer.concat([
    mqttString("MQTT"),
    Buffer.from([4, 2, 0, 60]),
    mqttString(clientId),
  ]));
}

function subscribePacket(topicFilter) {
  return mqttPacket(0x82, Buffer.concat([
    Buffer.from([0, 1]),
    mqttString(topicFilter),
    Buffer.from([0]),
  ]));
}

function parsePackets(buffer, onPacket) {
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const packetStart = offset;
    const header = buffer[offset++];
    let multiplier = 1;
    let length = 0;
    let byte;
    do {
      if (offset >= buffer.length) return buffer.subarray(packetStart);
      byte = buffer[offset++];
      length += (byte & 127) * multiplier;
      multiplier *= 128;
    } while ((byte & 128) !== 0);
    if (offset + length > buffer.length) return buffer.subarray(packetStart);
    onPacket(header, buffer.subarray(offset, offset + length));
    offset += length;
  }
  return buffer.subarray(offset);
}

function callSettingsEndpoint() {
  const url = new URL(backendUrl);
  const payload = JSON.stringify({
    minTemp: 5,
    maxTemp: 20,
    maxVibration: 2,
    turnOn: true,
  });

  const request = http.request({
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  }, (response) => {
    let body = "";
    response.on("data", (chunk) => body += chunk);
    response.on("end", () => {
      console.log(`Settings API HTTP ${response.statusCode}: ${body}`);
    });
  });

  request.on("error", (error) => {
    console.log(`Settings API error: ${error.message}`);
  });
  request.write(payload);
  request.end();
}

let pending = Buffer.alloc(0);
const clientId = `settings-check-${Math.random().toString(16).slice(2)}`;
const socket = net.createConnection({ host: mqttHost, port: mqttPort, timeout: 10000 }, () => {
  socket.setTimeout(0);
  socket.write(connectPacket(clientId));
});

socket.on("data", (chunk) => {
  pending = Buffer.concat([pending, chunk]);
  pending = parsePackets(pending, (header, body) => {
    const packetType = header >> 4;
    if (packetType === 2) {
      console.log(`Connected to MQTT broker ${mqttHost}:${mqttPort}`);
      socket.write(subscribePacket(topic));
      return;
    }

    if (packetType === 9) {
      console.log(`Subscribed to ${topic}`);
      callSettingsEndpoint();
      return;
    }

    if (packetType === 3) {
      const topicLength = body.readUInt16BE(0);
      const messageTopic = body.subarray(2, 2 + topicLength).toString();
      const payload = body.subarray(2 + topicLength).toString();
      console.log(`[${messageTopic}] ${payload}`);
      socket.end();
    }
  });
});

socket.on("timeout", () => {
  console.log("MQTT connection timed out");
  socket.destroy();
});

socket.on("error", (error) => {
  console.log(`MQTT error: ${error.message}`);
});

setTimeout(() => {
  socket.end();
}, 15000);
