import express from "express";
import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client, LocalAuth } = pkg;

const BASE44_FUNCTION_URL =
  process.env.BASE44_FUNCTION_URL ||
  "https://urbania-assistant.base44.app/functions/whatsappRespond";

// --- 1) Puerto HTTP (OBLIGATORIO para Render Web Service) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.status(200).send("OK"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HTTP listening on ${PORT}`);
});

// --- 2) Sesión ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, ".wwebjs_auth");
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

// --- 3) Cliente WhatsApp ---
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "urbania", dataPath: SESSION_DIR }),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// --- 4) Eventos (FUERA del QR) ---
client.on("qr", (qr) => {
  console.log("📱 Escanea este QR (WhatsApp → Dispositivos vinculados):");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => console.log("✅ Bot listo"));

client.on("message", async (message) => {
  // Ignora grupos y status
  if (message.from.includes("@g.us") || message.from.includes("status@broadcast")) return;

  const text = (message.body || "").trim();
  if (!text) return;

  try {
    const response = await fetch(BASE44_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, from: message.from }),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      console.error("Base44 error:", response.status, raw);
      await message.reply("Disculpa, ahora mismo tengo un problema técnico.");
      return;
    }

    const data = await response.json().catch(() => ({}));
    await message.reply(data.response || "Error");
  } catch (error) {
    console.error("Handler error:", error);
    await message.reply("Disculpa, error al procesar.");
  }
});

// --- 5) Inicializa UNA sola vez ---
client.initialize();