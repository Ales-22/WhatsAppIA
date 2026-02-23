import express from "express";
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client, LocalAuth } = pkg;

// ---------- PUERTO PARA RENDER ----------
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("OK"));
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 HTTP activo en ${PORT}`);
});
// ---------------------------------------

// IMPORTANTE: Cambia esta URL por la de tu app
const BASE44_FUNCTION_URL = 'https://urbania-assistant.base44.app/functions/whatsappRespond';

const SESSION_DIR = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    ".wwebjs_auth"
  );

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

console.log('🚀 Iniciando bot de WhatsApp...');

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'urbania',
    dataPath: SESSION_DIR
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  console.log('\n📱 ESCANEA ESTE QR:\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ Autenticado');
});

client.on('ready', () => {
  console.log('✅ Bot listo');
});

client.on('disconnected', (reason) => {
  console.log('❌ Desconectado:', reason);
});

client.on('message', async (message) => {
  if (message.from.includes('@g.us') || message.from.includes('status@broadcast')) return;

  try {
    const response = await fetch(BASE44_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.body })
    });

    const data = await response.json();
    const reply = data.response || 'No pude procesar tu mensaje.';

    const chunks = reply.match(/[\s\S]{1,4000}/g) || [reply];
    for (const chunk of chunks) {
      await message.reply(chunk);
      if (chunks.length > 1) await new Promise(r => setTimeout(r, 500));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    await message.reply('Disculpa, ocurrió un error.');
  }
});

client.initialize();

process.on('SIGINT', async () => {
  console.log('\n⚠️ Cerrando bot...');
  await client.destroy();
  process.exit(0);
});