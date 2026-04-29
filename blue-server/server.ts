// Ensure env vars are set before any ElizaOS imports
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}
if (!process.env.SECRET_SALT) {
  process.env.SECRET_SALT = "blue-os-salt-mwa";
}

import express from "express";
import { v4 as uuidv4 } from "uuid";
import {
  AgentRuntime,
  createCharacter,
  createMessageMemory,
  elizaLogger,
  stringToUuid,
  ChannelType,
  ensureConnection,
  type Character,
  type UUID,
} from "@elizaos/core";

const { openaiPlugin } = require("@elizaos/plugin-openai");
const { plugin: sqlPlugin } = require("@elizaos/plugin-sql");
const { elizaClassicPlugin } = require("@elizaos/plugin-eliza-classic");

import blueCharacterData from "./lib/bluepersonality.json";

const PORT = parseInt(process.env.PORT || "3001", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const POSTGRES_URL = process.env.POSTGRES_URL || "";
const blueCharacter = blueCharacterData as any;

function normalizeMessageExamples(messageExamples: unknown) {
  if (!Array.isArray(messageExamples)) return [];

  return messageExamples.map((entry) => {
    if (Array.isArray(entry)) return entry;
    if (entry && typeof entry === "object" && Array.isArray((entry as { examples?: unknown[] }).examples)) {
      return (entry as { examples: unknown[] }).examples;
    }
    return [];
  }).filter((entry) => entry.length > 0);
}

const voiceSettings = blueCharacter.settings?.voice ?? (
  blueCharacter.tts?.provider === "elevenlabs"
    ? {
        provider: "elevenlabs",
        voiceId: blueCharacter.tts?.elevenlabs?.voiceId,
        model: blueCharacter.tts?.elevenlabs?.modelId,
      }
    : undefined
);

// ── Character setup ──────────────────────────────────────────
const character: Character = createCharacter({
  ...blueCharacter,
  name: blueCharacter.name || "Blue",
  bio: blueCharacter.bio || "Blue OS - behavioral psychologist at Mental Wealth Academy.",
  messageExamples: normalizeMessageExamples(blueCharacter.messageExamples),
  secrets: {
    OPENAI_API_KEY,
    ELEVENLABS_API_KEY,
    POSTGRES_URL,
  },
  settings: {
    ...blueCharacter.settings,
    ...(voiceSettings ? { voice: voiceSettings } : {}),
    POSTGRES_URL,
    OPENAI_BASE_URL,
    model: process.env.SMALL_MODEL || "gemma3:4b",
    secrets: {
      OPENAI_API_KEY,
      OPENAI_BASE_URL,
      ELEVENLABS_API_KEY,
      POSTGRES_URL,
      SMALL_MODEL: process.env.SMALL_MODEL || "gemma3:4b",
      LARGE_MODEL: process.env.LARGE_MODEL || "gemma3:4b",
    },
  },
} as any);

// ── Runtime initialization ───────────────────────────────────
let runtime: AgentRuntime;
let initMode = "elizaos";
let initError: string | null = null;

async function initializeRuntime() {
  try {
    runtime = new AgentRuntime(character);

    runtime.registerPlugin(sqlPlugin);

    if (OPENAI_API_KEY) {
      runtime.registerPlugin(openaiPlugin);
      elizaLogger.info(`Blue server: OpenAI plugin registered (base: ${OPENAI_BASE_URL || 'default'})`);
    } else {
      runtime.registerPlugin(elizaClassicPlugin);
      initMode = "classic";
      elizaLogger.warn("Blue server: No OPENAI_API_KEY -- using classic ELIZA fallback");
    }

    await runtime.initialize();
    elizaLogger.info(`Blue server initialized in ${initMode} mode`);
    if (POSTGRES_URL) elizaLogger.info("Database: PostgreSQL");
    else elizaLogger.info("Database: PGLite (embedded)");
  } catch (err: any) {
    elizaLogger.error("Blue runtime init failed:", err.message);
    initError = err.message;

    try {
      runtime = new AgentRuntime(character);
      runtime.registerPlugin(elizaClassicPlugin);
      await runtime.initialize();
      initMode = "classic";
      initError = null;
      elizaLogger.info("Blue server: fell back to classic mode (no database)");
    } catch (fallbackErr: any) {
      elizaLogger.error("Blue classic fallback also failed:", fallbackErr.message);
      initError = fallbackErr.message;
    }
  }
}

// ── Express app ──────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/", (_req, res) => {
  res.json({
    name: character.name,
    bio: typeof character.bio === "string" ? character.bio : character.bio?.[0] || "",
    version: "1.0.0",
    powered_by: "elizaOS + Ollama",
    mode: initMode,
    endpoints: {
      "POST /chat": "Send a message and receive a response",
      "GET /health": "Health check endpoint",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: initError ? "degraded" : "healthy",
    mode: initMode,
    character: character.name,
    error: initError,
    timestamp: new Date().toISOString(),
  });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, userId: rawUserId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    if (!runtime) {
      return res.status(503).json({ error: "Blue runtime not initialized" });
    }

    const userId = stringToUuid(rawUserId || uuidv4()) as UUID;
    const roomId = stringToUuid(`blue-chat-${rawUserId || userId}`) as UUID;

    try {
      const worldId = stringToUuid("blue-world") as UUID;
      await ensureConnection(runtime, {
        entityId: userId,
        roomId,
        worldId,
        userName: rawUserId || "anonymous",
        name: rawUserId || "Anonymous User",
        source: "rest_api",
      });
    } catch (connErr: any) {
      elizaLogger.warn("ensureConnection failed:", connErr.message?.slice(0, 100));
    }

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

    let responseText = "";

    try {
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
    } catch (msgErr: any) {
      elizaLogger.warn("Message pipeline error:", msgErr.message?.slice(0, 120));
    }

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

// ── Start ────────────────────────────────────────────────────
async function main() {
  // Pull Ollama model if connected to Ollama
  if (OPENAI_BASE_URL.includes("ollama")) {
    const ollamaHost = OPENAI_BASE_URL.replace("/v1", "");
    const model = process.env.SMALL_MODEL || "mistral:7b";
    elizaLogger.info(`Pulling Ollama model: ${model}...`);
    try {
      await fetch(`${ollamaHost}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model, stream: false }),
      });
      elizaLogger.info(`Ollama model ${model} ready`);
    } catch (err: any) {
      elizaLogger.warn(`Ollama pull failed (may already exist): ${err.message}`);
    }
  }

  await initializeRuntime();

  app.listen(PORT, () => {
    elizaLogger.info(`Blue OS server running on port ${PORT} (${initMode} mode)`);
    if (OPENAI_BASE_URL) elizaLogger.info(`LLM: Ollama at ${OPENAI_BASE_URL}`);
    else elizaLogger.info("LLM: OpenAI API");
    if (ELEVENLABS_API_KEY) elizaLogger.info("ElevenLabs: configured");
    else elizaLogger.warn("ElevenLabs: NOT configured");
  });
}

main().catch((err) => {
  elizaLogger.error("Fatal error starting Blue server:", err);
  process.exit(1);
});
