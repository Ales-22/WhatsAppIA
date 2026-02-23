import pkg from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client, LocalAuth } = pkg;
const BASE44_FUNCTION_URL = 'https://urbania-assistant.base44.app/functions/whatsappRespond';
const SESSION_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.wwebjs_auth');

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'urbania', dataPath: SESSION_DIR }),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', (qr) => console.log('📱 QR:\n', qr));
client.on('ready', () => console.log('✅ Bot listo'));

client.on('message', async (message) => {
  if (message.from.includes('@g.us') || message.from.includes('status@broadcast')) return;
  
  try {
    const response = await fetch(BASE44_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.body })
    });
    
    const data = await response.json();
    await message.reply(data.response || 'Error');
  } catch (error) {
    await message.reply('Disculpa, error al procesar.');
  }
});

client.initialize();