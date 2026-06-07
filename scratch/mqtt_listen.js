const net = require("net");

const host = process.argv[2] || "16.171.206.168";
const port = Number(process.argv[3] || 1883);
const topic = process.argv[4] || "bunker/+/+";
const listenMs = Number(process.argv[5] || 25000);

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

function subscribePacket(topicFilter) {
  const body = Buffer.concat([
    Buffer.from([0, 1]),
    mqttString(topicFilter),
    Buffer.from([0]),
  ]);
  return mqttPacket(0x82, body);
}

function parseAvailablePackets(buffer, onPacket) {
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const packetStart = offset;
    const header = buffer[offset++];
    let multiplier = 1;
    let remainingLength = 0;
    let encodedByte;

    do {
      if (offset >= buffer.length) return buffer.subarray(packetStart);
      encodedByte = buffer[offset++];
      remainingLength += (encodedByte & 127) * multiplier;
      multiplier *= 128;
    } while ((encodedByte & 128) !== 0);

    if (offset + remainingLength > buffer.length) {
      return buffer.subarray(packetStart);
    }

    onPacket(header, buffer.subarray(offset, offset + remainingLength));
    offset += remainingLength;
  }
  return buffer.subarray(offset);
}

let pending = Buffer.alloc(0);
let messageCount = 0;
const clientId = `codex-check-${Math.random().toString(16).slice(2)}`;

const socket = net.createConnection({ host, port, timeout: 10000 }, () => {
  console.log(`Connected to ${host}:${port}`);
  socket.setTimeout(0);
  socket.write(connectPacket(clientId));
});

socket.on("data", (chunk) => {
  pending = Buffer.concat([pending, chunk]);
  pending = parseAvailablePackets(pending, (header, body) => {
    const packetType = header >> 4;
    if (packetType === 2) {
      console.log("MQTT CONNACK received");
      socket.write(subscribePacket(topic));
      return;
    }

    if (packetType === 9) {
      console.log(`Subscribed to ${topic}; listening for ${listenMs / 1000}s...`);
      return;
    }

    if (packetType === 3) {
      const topicLength = body.readUInt16BE(0);
      const messageTopic = body.subarray(2, 2 + topicLength).toString();
      const payload = body.subarray(2 + topicLength).toString();
      messageCount += 1;
      console.log(`[${messageTopic}] ${payload}`);
    }
  });
});

socket.on("timeout", () => {
  console.log("TCP connection timed out");
  socket.destroy();
});

socket.on("error", (error) => {
  console.log(`MQTT check error: ${error.message}`);
});

socket.on("close", () => {
  console.log(`Listen finished. Messages received: ${messageCount}`);
});

setTimeout(() => {
  socket.end();
}, listenMs);
