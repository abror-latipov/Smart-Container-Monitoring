const net = require("net");

const host = process.argv[2] || "16.171.206.168";
const port = Number(process.argv[3] || 1883);
const intervalMs = Number(process.argv[4] || 3000);
const maxTicks = process.argv[5] === undefined ? Math.ceil(60000 / intervalMs) : Number(process.argv[5]);
const alertEveryTicks = Number(process.argv[6] || 6);

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
  return mqttPacket(0x30, Buffer.concat([
    mqttString(topicName),
    Buffer.from(JSON.stringify(payload)),
  ]));
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

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

const demoContainers = [
  {
    id: "002",
    baseTemp: 6.2,
    baseHum: 48,
    lat: 41.3091,
    lng: 69.2797,
    speed: 0.18,
  },
  {
    id: "003",
    baseTemp: 18.6,
    baseHum: 58,
    lat: 41.3364,
    lng: 69.3342,
    speed: 0.28,
  },
];

let tick = 0;
let pending = Buffer.alloc(0);
let started = false;
let intervalHandle = null;
const clientId = `demo-sender-${Math.random().toString(16).slice(2)}`;
console.log(`Connecting to ${host}:${port}...`);
const socket = net.createConnection({ host, port, timeout: 10000 }, () => {
  socket.setTimeout(0);
  socket.write(connectPacket(clientId));
});

socket.on("data", (buffer) => {
  pending = Buffer.concat([pending, buffer]);
  pending = parseAvailablePackets(pending, (header) => {
    if ((header >> 4) !== 2 || started) return;
    started = true;
    console.log(`Connected to ${host}:${port}`);
    console.log(`Sending fake data for MQTT containers 002 and 003 only${maxTicks > 0 ? ` for ${maxTicks} ticks` : ""}. Press Ctrl+C to stop.`);
    console.log(`Alert spikes: first tick and every ${alertEveryTicks} tick(s).`);

    intervalHandle = setInterval(() => {
      tick += 1;
      const absoluteTick = Math.floor(Date.now() / Math.max(intervalMs, 1000)) + tick;
      for (const container of demoContainers) {
        const containerOffset = Number(container.id);
        const drift = Math.sin(absoluteTick / 2 + containerOffset) * 1.4;
        const humidityDrift = Math.cos(absoluteTick / 3 + containerOffset) * 6;
        const vibrationSpike = tick === 1 || (alertEveryTicks > 0 && tick % alertEveryTicks === 0);
        const lat = container.lat + Math.sin(absoluteTick / 4 + containerOffset) * 0.006;
        const lng = container.lng + Math.cos(absoluteTick / 4 + containerOffset) * 0.006;
        const speed = container.speed + Math.abs(Math.sin(absoluteTick / 2 + containerOffset)) * 0.45;
        const vibPeak = vibrationSpike ? 4.6 : 0.6 + Math.abs(Math.sin(absoluteTick / 2 + containerOffset)) * 1.8;
        const vibAvg = vibPeak / 3;

        const tempPayload = {
          timestamp: timestamp(),
          temp: Number((container.baseTemp + drift).toFixed(1)),
          hum: Number((container.baseHum + humidityDrift).toFixed(1)),
        };
        const vibrationPayload = {
          timestamp: timestamp(),
          lat: Number(lat.toFixed(8)),
          lng: Number(lng.toFixed(8)),
          speed: Number(speed.toFixed(5)),
          vib_avg: Number(vibAvg.toFixed(9)),
          vib_peak: Number(vibPeak.toFixed(9)),
          unit: "g",
        };
        const locationPayload = {
          timestamp: timestamp(),
          lat: Number(lat.toFixed(8)),
          lng: Number(lng.toFixed(8)),
        };

        socket.write(publishPacket(`bunker/${container.id}/temperature`, tempPayload));
        socket.write(publishPacket(`bunker/${container.id}/vibration`, vibrationPayload));
        socket.write(publishPacket(`bunker/${container.id}/location`, locationPayload));

        console.log(`[${container.id}] temp=${tempPayload.temp} hum=${tempPayload.hum} vib=${vibrationPayload.vib_peak} speed=${vibrationPayload.speed}`);
      }
      if (maxTicks > 0 && tick >= maxTicks) {
        clearInterval(intervalHandle);
        console.log("Demo sender finished.");
        socket.end();
      }
    }, intervalMs);
  });
});

setTimeout(() => {
  if (!started) {
    console.log("MQTT CONNACK was not received.");
    socket.destroy();
    process.exitCode = 1;
  }
}, 12000);

socket.on("timeout", () => {
  console.log("Connection timed out");
  socket.destroy();
  process.exitCode = 1;
});

socket.on("error", (error) => {
  console.log(`Demo sender error: ${error.message}`);
  process.exitCode = 1;
});

process.on("SIGINT", () => {
  console.log("\nStopping demo sender.");
  socket.end();
  process.exit(0);
});
