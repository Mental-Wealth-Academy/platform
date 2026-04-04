import express from "express";
import { v4 as uuidv4 } from "uuid";
import {
  AgentRuntime,
  createCharacter,
  createMessageMemory,
  elizaLogger,
  stringToUuid,
  ChannelType,
  type Character,
  type UUID,
} from "@elizaos/core";
import { openaiPlugin } from "@elizaos/plugin-openai";
import { sqlPlugin } from "@elizaos/plugin-sql";
import { elizaClassicPlugin } from "@elizaos/plugin-eliza-classic";

// ── Load Blue character from personality file ────────────────
import blueCharacterData from "../lib/bluepersonality.json";

const PORT = parseInt(process.env.PORT || "3001", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

// ── Character setup ──────────────────────────────────────────
const character: Character = createCharacter({
  ...blueCharacterData,
  name: blueCharacterData.name || "Blue",
  bio: blueCharacterData.bio || "Blue OS - behavioral psychologist at Mental Wealth Academy.",
  secrets: {
    OPENAI_API_KEY,
    ELEVENLABS_API_KEY,
  },
} as any);

// ── Runtime initialization ───────────────────────────────────
let runtime: AgentRuntime;
let initMode = "elizaos";
let initError: string | null = null;

async function initializeRuntime() {
  try {
    runtime = new AgentRuntime(character);

    // Add database plugin
    runtime.registerPlugin(sqlPlugin);

    // Add AI plugin -- OpenAI if key exists, else classic pattern matching
    if (OPENAI_API_KEY) {
      runtime.registerPlugin(openaiPlugin);
      elizaLogger.info("Blue server: OpenAI plugin registered");
    } else {
      runtime.registerPlugin(elizaClassicPlugin);
      initMode = "classic";
      elizaLogger.warn("Blue server: No OPENAI_API_KEY -- using classic ELIZA fallback");
    }

    await runtime.initialize();
    elizaLogger.info(`Blue server initialized in ${initMode} mode`);
  } catch (err: any) {
    elizaLogger.error("Blue runtime init failed:", err.message);
    initError = err.message;

    // Fallback: try classic mode without database
    try {
      runtime = new AgentRuntime(character);
      runtime.registerPlugin(elizaClassicPlugin);
      await runtime.initialize();
      initMode = "classic";
      initError = null;
      elizaLogger.info("Blue server: fell back to classic mode");
    } catch (fallbackErr: any) {
      elizaLogger.error("Blue classic fallback also failed:", fallbackErr.message);
      initError = fallbackErr.message;
    }
  }
}

// ── Express app ──────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── GET / ────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: character.name,
    bio: typeof character.bio === "string" ? character.bio : character.bio?.[0] || "",
    version: "1.0.0",
    powered_by: "elizaOS",
    framework: "Express.js",
    mode: initMode,
    endpoints: {
      "POST /chat": "Send a message and receive a response",
      "GET /health": "Health check endpoint",
      "GET /": "This info endpoint",
    },
  });
});

// ── GET /health ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: initError ? "degraded" : "healthy",
    mode: initMode,
    character: character.name,
    error: initError,
    timestamp: new Date().toISOString(),
  });
});

// ── POST /chat ───────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    const { message, userId: rawUserId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    if (!runtime) {
      return res.status(503).json({ error: "Blue runtime not initialized" });
    }

    const userId = (rawUserId || uuidv4()) as UUID;
    const roomId = stringToUuid(`blue-chat-${userId}`) as UUID;

    // Create message memory through the canonical pipeline
    const messageMemory = createMessageMemory({
      id: uuidv4() as UUID,
      entityId: userId,
      roomId,
      content: {
        text: message,
        source: "rest_api",
        channelType: ChannelType.DM,
      },
    });

    // Process through elizaOS message service
    let responseText = "";

    await runtime.messageService?.handleMessage(
      runtime,
      messageMemory,
      async (content) => {
        if (content?.text) {
          responseText += content.text;
        }
        return [];
      }
    );

    if (!responseText) {
      responseText = "I'm here. Give me something to work with.";
    }

    res.json({
      response: responseText,
      character: character.name,
      userId,
      mode: initMode,
    });
  } catch (err: any) {
    elizaLogger.error("Chat error:", err.message);
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

// ── POST /chat/stream ────────────────────────────────────────
app.post("/chat/stream", async (req, res) => {
  try {
    const { message, userId: rawUserId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    if (!runtime) {
      return res.status(503).json({ error: "Blue runtime not initialized" });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const userId = (rawUserId || uuidv4()) as UUID;
    const roomId = stringToUuid(`blue-chat-${userId}`) as UUID;

    const messageMemory = createMessageMemory({
      id: uuidv4() as UUID,
      entityId: userId,
      roomId,
      content: {
        text: message,
        source: "rest_api",
        channelType: ChannelType.DM,
      },
    });

    await runtime.messageService?.handleMessage(
      runtime,
      messageMemory,
      async (content) => {
        if (content?.text) {
          res.write(`data: ${JSON.stringify({ text: content.text })}\n\n`);
        }
        return [];
      }
    );

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    elizaLogger.error("Stream error:", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Start ────────────────────────────────────────────────────
async function main() {
  await initializeRuntime();

  app.listen(PORT, () => {
    elizaLogger.info(`Blue OS server running on port ${PORT} (${initMode} mode)`);
    if (OPENAI_API_KEY) elizaLogger.info("OpenAI: configured");
    else elizaLogger.warn("OpenAI: NOT configured -- using classic fallback");
    if (ELEVENLABS_API_KEY) elizaLogger.info("ElevenLabs: configured");
    else elizaLogger.warn("ElevenLabs: NOT configured");
  });
}

main().catch((err) => {
  elizaLogger.error("Fatal error starting Blue server:", err);
  process.exit(1);
});
