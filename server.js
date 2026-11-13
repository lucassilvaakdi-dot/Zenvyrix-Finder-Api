const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const app = express();
app.use(express.json());
app.use(express.text({ limit: "1mb" }));

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || "./data";
const LOG_FILE = path.join(DATA_DIR, "brainrot_logs.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadLogs() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            const data = fs.readFileSync(LOG_FILE, "utf8");
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error loading logs:", e);
    }
    return [];
}

function saveLogs(logs) {
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error("Error saving logs:", e);
    }
}

let allLogs = loadLogs();

app.post("/logs", (req, res) => {
    let data;
    
    try {
        if (typeof req.body === "string") {
            const parts = req.body.split("|");
            data = {
                brainrotName: parts[0],
                brainrotMoney: parts[1],
                mutation: parts[2],
                jobId: parts[3],
                placeId: parts[4],
                ownerBrainrot: parts[5],
                slotsPerSlot: parts[6],
                players: parts[7],
                brainrotImageUrl: parts[8]
            };
        } else {
            data = req.body;
        }
    } catch (e) {
        return res.status(400).send("Invalid data format");
    }

    const name = data.brainrotName || data.name;
    const money = data.brainrotMoney || data.money;

    if (!name || !money) {
        return res.status(400).send("Error: Brainrot Name and Money are required.");
    }

    const newLog = {
        id: Date.now().toString(),
        brainrotName: name,
        brainrotMoney: money,
        mutation: data.mutation || "None",
        jobId: data.jobId || "",
        placeId: data.placeId || "",
        ownerBrainrot: data.ownerBrainrot || "Unknown",
        slotsPerSlot: data.slotsPerSlot || "0",
        players: data.players || "Unknown",
        brainrotImageUrl: data.brainrotImageUrl || "",
        timestamp: new Date().toISOString()
    };

    allLogs.unshift(newLog);
    
    if (allLogs.length > 500) {
        allLogs.pop();
    }
    
    saveLogs(allLogs);
    console.log("[LOG RECEIVED]", newLog.brainrotName, "-", newLog.brainrotMoney);

    wss.clients.forEach(c => {
        if (c.readyState === 1) c.send(JSON.stringify(newLog));
    });

    res.status(200).send("ok");
});

app.get("/logs", (req, res) => {
    res.json(allLogs);
});

app.get("/", (req, res) => {
    res.send("<h1>Zenvyrix Finder API</h1><p>Status: Online</p><p><a href='/logs'>View Logs</a></p>");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });

wss.on("connection", (ws) => {
    console.log("WS Client connected | total:", wss.clients.size);
    ws.on("close", () => console.log("WS Client disconnected | total:", wss.clients.size));
    ws.on("error", (e) => console.log("WS Error:", e.message));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
    console.log("Saving logs to:", LOG_FILE);
});
