// ============================================
//   FIZZA BOT + API  (Single File)
//   Credit: @FizzaGirl
// ============================================

const TelegramBot = require("node-telegram-bot-api");
const Database = require("better-sqlite3");
const express = require("express");

// ---------- CONFIG ----------
const TOKEN    = "8892960499:AAHKNmLd2Wf744aJniFsBoALPiDhevauXfs";
const ADMIN_ID = "8285095915";
const PORT     = process.env.PORT || 3000;

// ---------- DATABASE (device pe save) ----------
const db = new Database("DATABASEBOT.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    active INTEGER DEFAULT 1,
    expiry TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// ---------- BOT ----------
const bot = new TelegramBot(TOKEN, { polling: true });

function isAdmin(msg) {
  return String(msg.from.id) === String(ADMIN_ID);
}

function generateKey() {
  return "FIZZA-" + Math.random().toString(36).substring(2, 8).toUpperCase() +
         "-" + Date.now().toString().slice(-4);
}

function isExpired(expiry) {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

// ---------- TELEGRAM COMMANDS ----------

bot.onText(/\/start/, (msg) => {
  if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, "❌ Sirf admin use kar sakta hai.\n\n_Credit: @FizzaGirl_", { parse_mode: "Markdown" });
  bot.sendMessage(msg.chat.id,
    `👋 *Fizza Key Bot*\n\n` +
    `📌 Commands:\n` +
    `/newkey <days> — nayi key banao\n` +
    `/listkeys — saari keys dekho\n` +
    `/on <key> — activate karo\n` +
    `/off <key> — deactivate karo\n` +
    `/del <key> — delete karo\n` +
    `/check <key> — status dekho\n\n` +
    `🌐 *API URL:*\n` +
    `\`http://localhost:${PORT}/api?key=YOUR_KEY&num=9876543210\`\n\n` +
    `_Credit: @FizzaGirl_`,
    { parse_mode: "Markdown" }
  );
});

// ➕ New Key
bot.onText(/\/newkey(?:\s+(\d+))?/, (msg, match) => {
  if (!isAdmin(msg)) return;
  const days = parseInt(match[1] || "30");
  const key  = generateKey();
  const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  try {
    db.prepare("INSERT INTO keys (key, active, expiry) VALUES (?, 1, ?)").run(key, expiry);
    bot.sendMessage(msg.chat.id,
      `✅ *Key Created*\n\n🔑 \`${key}\`\n📅 Expiry: ${days} days\n🟢 Status: Active`,
      { parse_mode: "Markdown" });
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ Error: " + e.message);
  }
});

// 📋 List Keys
bot.onText(/\/listkeys/, (msg) => {
  if (!isAdmin(msg)) return;
  const rows = db.prepare("SELECT * FROM keys ORDER BY id DESC LIMIT 50").all();
  if (!rows.length) return bot.sendMessage(msg.chat.id, "Koi key nahi hai. /newkey 30 se banao.");
  let out = "📋 *All Keys*\n\n";
  for (const r of rows) {
    const exp = isExpired(r.expiry) ? "❌" : "✅";
    out += `🔑 \`${r.key}\`\n   ${r.active ? "🟢 ON" : "🔴 OFF"} | ${exp} exp: ${r.expiry?.slice(0,10)}\n\n`;
  }
  bot.sendMessage(msg.chat.id, out, { parse_mode: "Markdown" });
});

// 🟢 ON
bot.onText(/\/on (.+)/, (msg, match) => {
  if (!isAdmin(msg)) return;
  const key = match[1].trim();
  const r = db.prepare("UPDATE keys SET active = 1 WHERE key = ?").run(key);
  bot.sendMessage(msg.chat.id, r.changes ? `🟢 ON: \`${key}\`` : "❌ Key nahi mili", { parse_mode: "Markdown" });
});

// 🔴 OFF
bot.onText(/\/off (.+)/, (msg, match) => {
  if (!isAdmin(msg)) return;
  const key = match[1].trim();
  const r = db.prepare("UPDATE keys SET active = 0 WHERE key = ?").run(key);
  bot.sendMessage(msg.chat.id, r.changes ? `🔴 OFF: \`${key}\`` : "❌ Key nahi mili", { parse_mode: "Markdown" });
});

// 🗑 Delete
bot.onText(/\/del (.+)/, (msg, match) => {
  if (!isAdmin(msg)) return;
  const key = match[1].trim();
  const r = db.prepare("DELETE FROM keys WHERE key = ?").run(key);
  bot.sendMessage(msg.chat.id, r.changes ? `🗑 Deleted: \`${key}\`` : "❌ Key nahi mili", { parse_mode: "Markdown" });
});

// 🔍 Check
bot.onText(/\/check (.+)/, (msg, match) => {
  if (!isAdmin(msg)) return;
  const key = match[1].trim();
  const r = db.prepare("SELECT * FROM keys WHERE key = ?").get(key);
  if (!r) return bot.sendMessage(msg.chat.id, "❌ Key nahi mili");
  bot.sendMessage(msg.chat.id,
    `🔑 \`${r.key}\`\n🟢 Active: ${r.active}\n📅 Expiry: ${r.expiry}\n${isExpired(r.expiry) ? "❌ EXPIRED" : "✅ Valid"}`,
    { parse_mode: "Markdown" });
});

// ---------- EXPRESS API ----------
const app = express();

app.get("/api", (req, res) => {
  const { key, num } = req.query;

  // Key check
  if (!key) {
    return res.json({ success: false, message: "Key required", credit: "@FizzaGirl" });
  }

  const row = db.prepare("SELECT * FROM keys WHERE key = ?").get(key);

  if (!row) {
    return res.json({ success: false, message: "Invalid key", credit: "@FizzaGirl" });
  }
  if (!row.active) {
    return res.json({ success: false, message: "Key is OFF", credit: "@FizzaGirl" });
  }
  if (isExpired(row.expiry)) {
    return res.json({ success: false, message: "Key expired", credit: "@FizzaGirl" });
  }

  // Number validate
  if (!num || !/^\d{10}$/.test(num)) {
    return res.json({ success: false, message: "Invalid number (10 digits)", credit: "@FizzaGirl" });
  }

  // Number info
  const info = {
    number: num,
    country: "India",
    country_code: "+91",
    operator: "Unknown",
    circle: "Unknown",
    type: "Mobile",
    timezone: "Asia/Kolkata",
    valid: true
  };

  res.json({
    success: true,
    data: info,
    credit: "@FizzaGirl"   // ✅ Sirf yahi last me
  });
});

app.get("/", (req, res) => {
  res.send("Fizza API running ✅ | Credit: @FizzaGirl");
});

app.listen(PORT, () => {
  console.log(`🌐 API running: http://localhost:${PORT}/api?key=YOUR_KEY&num=9876543210`);
  console.log(`🤖 Bot started | Admin: ${ADMIN_ID}`);
  console.log(`💾 DB: DATABASEBOT.db`);
});
