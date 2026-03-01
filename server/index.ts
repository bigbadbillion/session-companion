import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is not set in .env — the server cannot proxy Gemini requests.");
  process.exit(1);
}

const PORT = Number(process.env.SERVER_PORT) || 3001;

const GEMINI_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

// --- Gemini Flash client for brief generation ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Express app ---
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", geminiConfigured: true });
});

app.post("/api/generate-brief", async (req, res) => {
  try {
    const { transcript, systemPrompt } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "transcript is required" });
    }

    const prompt = systemPrompt
      ? `${systemPrompt}\n\nTranscript:\n${transcript}`
      : transcript;

    const result = await flashModel.generateContent(prompt);
    let text = result.response.text().trim();

    // Strip markdown code fences if present
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch {
      return res.json({ raw: text });
    }
  } catch (err: any) {
    console.error("Brief generation error:", err.message);
    return res.status(500).json({ error: "Brief generation failed", detail: err.message });
  }
});

// --- HTTP + WebSocket server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const { url } = req;
  if (url === "/ws/session") {
    wss.handleUpgrade(req, socket, head, (clientSocket) => {
      wss.emit("connection", clientSocket, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (clientSocket) => {
  console.log("[ws] Client connected — opening upstream to Gemini Live API");

  const geminiUrl = `${GEMINI_WS_URL}?key=${GEMINI_API_KEY}`;
  const geminiSocket = new WebSocket(geminiUrl);

  let clientQueue: (string | Buffer)[] = [];

  geminiSocket.on("open", () => {
    console.log("[ws] Gemini upstream connection open");
    // Flush any messages queued before upstream was ready
    for (const msg of clientQueue) {
      geminiSocket.send(msg);
    }
    clientQueue = [];
  });

  // Client → Gemini
  clientSocket.on("message", (data) => {
    if (geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.send(data);
    } else {
      clientQueue.push(data as string | Buffer);
    }
  });

  // Gemini → Client
  geminiSocket.on("message", (data) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(data);
    }
  });

  // Error handling
  geminiSocket.on("error", (err) => {
    console.error("[ws] Gemini upstream error:", err.message);
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(1011, "Upstream error");
    }
  });

  clientSocket.on("error", (err) => {
    console.error("[ws] Client socket error:", err.message);
    if (geminiSocket.readyState === WebSocket.OPEN) {
      geminiSocket.close();
    }
  });

  // Close propagation
  clientSocket.on("close", () => {
    console.log("[ws] Client disconnected — closing Gemini upstream");
    if (geminiSocket.readyState === WebSocket.OPEN || geminiSocket.readyState === WebSocket.CONNECTING) {
      geminiSocket.close();
    }
  });

  geminiSocket.on("close", () => {
    console.log("[ws] Gemini upstream closed");
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(1000, "Upstream closed");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Prelude API server running on http://localhost:${PORT}`);
  console.log(`  POST /api/generate-brief  — Gemini Flash brief generation`);
  console.log(`  WS   /ws/session          — Gemini Live API proxy`);
  console.log(`  GET  /api/health          — Health check`);
});
