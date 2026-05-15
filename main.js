const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  clipboard,
  ipcMain,
  nativeImage,
  net,
  safeStorage,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const zlib = require("zlib");
const crypto = require("crypto");
const { URL } = require("url");

const MODEL_PRICES = [
  { match: /gpt-5\.5/i, provider: "OpenAI", name: "GPT-5.5", input: 1.75, cached: 0.175, output: 14 },
  { match: /gpt-5\.2/i, provider: "OpenAI", name: "GPT-5.2", input: 1.75, cached: 0.175, output: 14 },
  { match: /gpt-5\.1/i, provider: "OpenAI", name: "GPT-5.1", input: 1.25, cached: 0.125, output: 10 },
  { match: /gpt-5-mini/i, provider: "OpenAI", name: "GPT-5 mini", input: 0.25, cached: 0.025, output: 2 },
  { match: /gpt-5-nano/i, provider: "OpenAI", name: "GPT-5 nano", input: 0.05, cached: 0.005, output: 0.4 },
  { match: /gpt-4\.1-mini/i, provider: "OpenAI", name: "GPT-4.1 mini", input: 0.4, cached: 0.1, output: 1.6 },
  { match: /gpt-4\.1-nano/i, provider: "OpenAI", name: "GPT-4.1 nano", input: 0.1, cached: 0.025, output: 0.4 },
  { match: /gpt-4\.1/i, provider: "OpenAI", name: "GPT-4.1", input: 2, cached: 0.5, output: 8 },
  { match: /gpt-4o-mini/i, provider: "OpenAI", name: "GPT-4o mini", input: 0.15, cached: 0.075, output: 0.6 },
  { match: /gpt-4o/i, provider: "OpenAI", name: "GPT-4o", input: 2.5, cached: 1.25, output: 10 },
  { match: /claude-opus/i, provider: "Anthropic", name: "Claude Opus", input: 15, cached: 1.875, output: 75 },
  { match: /claude-sonnet/i, provider: "Anthropic", name: "Claude Sonnet", input: 3, cached: 0.3, output: 15 },
  { match: /claude-haiku/i, provider: "Anthropic", name: "Claude Haiku", input: 0.8, cached: 0.08, output: 4 },
];

const LICENSE_PREFIX = "TT-PRO-";
const LICENSE_PRODUCT_ID = "tokentotal";
const PURCHASE_URL = process.env.TOKENTOTAL_PURCHASE_URL || "";
const LICENSE_PUBLIC_KEY_PEM = readLicensePublicKey();
const PRO_FEATURES = Object.freeze([
  "connectors",
  "localChat",
  "promptEnglish",
  "cloudUsage",
  "exportData",
  "unlimitedHistory",
]);

function readLicensePublicKey() {
  if (process.env.TOKENTOTAL_LICENSE_PUBLIC_KEY) {
    return process.env.TOKENTOTAL_LICENSE_PUBLIC_KEY.replace(/\\n/g, "\n");
  }
  const candidates = [
    process.env.TOKENTOTAL_LICENSE_PUBLIC_KEY_PATH,
    path.join(__dirname, "license-public.pem"),
    !app.isPackaged ? path.join(__dirname, ".license", "public.pem") : "",
  ].filter(Boolean);

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      try {
        return fs.readFileSync(filePath, "utf8");
      } catch {
        return "";
      }
    }
  }
  return "";
}

function base64UrlToBuffer(value = "") {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  return Buffer.from(padded, "base64");
}

function normalizeLicenseKey(value = "") {
  return String(value).trim().replace(/\s+/g, "");
}

function freeLicenseStatus(reason = "") {
  return {
    activated: false,
    isPro: false,
    plan: "free",
    status: "free",
    reason,
    features: ["estimate", "promptSlim", "manualHistory"],
    freeLimits: { history: 100 },
    purchaseUrl: PURCHASE_URL,
  };
}

function parseLicenseDate(value) {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function buildProLicenseStatus(payload, source = "signed") {
  const expiresAt = parseLicenseDate(payload.expiresAt || payload.exp || payload.expiry);
  const features = Array.isArray(payload.features) && payload.features.length
    ? payload.features
    : PRO_FEATURES;
  return {
    activated: true,
    isPro: true,
    plan: payload.plan || "pro",
    status: "active",
    source,
    licenseId: payload.licenseId || payload.id || "",
    email: payload.email || payload.customerEmail || "",
    customerName: payload.customerName || payload.name || "",
    issuedAt: payload.issuedAt || payload.iat || "",
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : "",
    features,
    purchaseUrl: PURCHASE_URL,
  };
}

function verifyLicenseSignature(payloadPart, signaturePart) {
  const data = Buffer.from(payloadPart, "utf8");
  const signature = base64UrlToBuffer(signaturePart);

  try {
    if (crypto.verify(null, data, LICENSE_PUBLIC_KEY_PEM, signature)) return true;
  } catch {
    // RSA/ECDSA keys need a digest-based verifier below.
  }

  const verifier = crypto.createVerify("sha256");
  verifier.update(payloadPart);
  verifier.end();
  return verifier.verify(LICENSE_PUBLIC_KEY_PEM, signature);
}

function verifyLicenseKey(value = "") {
  const licenseKey = normalizeLicenseKey(value);
  if (!licenseKey) {
    return { success: false, error: "请输入 License Key", status: freeLicenseStatus("missing") };
  }

  if (!app.isPackaged && licenseKey === "TT-DEV-PRO") {
    return {
      success: true,
      status: buildProLicenseStatus(
        {
          plan: "pro",
          licenseId: "developer",
          email: "developer@tokentotal.local",
          features: PRO_FEATURES,
        },
        "developer"
      ),
    };
  }

  if (!licenseKey.startsWith(LICENSE_PREFIX)) {
    return { success: false, error: "License Key 格式不正确", status: freeLicenseStatus("invalid-format") };
  }

  const signedPart = licenseKey.slice(LICENSE_PREFIX.length);
  const [payloadPart, signaturePart] = signedPart.split(".");
  if (!payloadPart || !signaturePart) {
    return { success: false, error: "License Key 缺少签名信息", status: freeLicenseStatus("invalid-format") };
  }

  let payload = null;
  try {
    payload = JSON.parse(base64UrlToBuffer(payloadPart).toString("utf8"));
  } catch {
    return { success: false, error: "License Key 内容无法解析", status: freeLicenseStatus("invalid-payload") };
  }

  const productId = payload.product || payload.productId || payload.app;
  if (productId && productId !== LICENSE_PRODUCT_ID) {
    return { success: false, error: "这个 License Key 不属于 TokenTotal", status: freeLicenseStatus("wrong-product") };
  }

  const expiresAt = parseLicenseDate(payload.expiresAt || payload.exp || payload.expiry);
  if (expiresAt && expiresAt < Date.now()) {
    return { success: false, error: "License Key 已过期", status: freeLicenseStatus("expired") };
  }

  if (!LICENSE_PUBLIC_KEY_PEM) {
    return {
      success: false,
      error: "当前构建未配置授权公钥，暂时只能在开发环境使用 TT-DEV-PRO 测试",
      status: freeLicenseStatus("missing-public-key"),
    };
  }

  try {
    const isValid = verifyLicenseSignature(payloadPart, signaturePart);
    if (!isValid) {
      return { success: false, error: "License Key 签名无效", status: freeLicenseStatus("bad-signature") };
    }
  } catch {
    return { success: false, error: "License Key 校验失败", status: freeLicenseStatus("verify-error") };
  }

  return { success: true, status: buildProLicenseStatus(payload, "signed") };
}

function findModelPrice(model = "", provider = "") {
  const matched = MODEL_PRICES.find((item) => item.match.test(model));
  if (matched) return matched;
  return {
    provider: provider || "Unknown",
    name: model || "Unknown",
    input: 0,
    cached: 0,
    output: 0,
  };
}

function calculateUsageCost({ model, provider, inputTokens = 0, cachedInputTokens = 0, outputTokens = 0 }) {
  const price = findModelPrice(model, provider);
  const cachedTokens = Math.max(0, cachedInputTokens || 0);
  const fullInputTokens = Math.max(0, inputTokens - cachedTokens);
  const inputCost = (fullInputTokens * price.input) / 1_000_000;
  const cachedCost = (cachedTokens * price.cached) / 1_000_000;
  const outputCost = (outputTokens * price.output) / 1_000_000;
  return {
    cost: inputCost + cachedCost + outputCost,
    provider: price.provider,
    displayModel: price.name,
  };
}

function detectProviderFromUrl(url = "") {
  if (/anthropic/i.test(url)) return "Anthropic";
  if (/openai|azure/i.test(url)) return "OpenAI";
  if (/11434|ollama/i.test(url)) return "Local";
  return "OpenAI-compatible";
}

function walkFiles(root, predicate, results = []) {
  if (!fs.existsSync(root)) return results;
  for (const item of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, item.name);
    if (item.isDirectory()) walkFiles(fullPath, predicate, results);
    else if (predicate(fullPath, item)) results.push(fullPath);
  }
  return results;
}

function readJsonLines(filePath, onObject) {
  const text = fs.readFileSync(filePath, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      onObject(JSON.parse(line));
    } catch {
      // Ignore corrupt or partial log lines.
    }
  }
}

function readTextBestEffort(filePath) {
  try {
    return fs.readFileSync(filePath).toString("utf8");
  } catch {
    return "";
  }
}

function extractFirst(text, pattern, fallback = "") {
  const match = text.match(pattern);
  return match ? match[1] : fallback;
}

function extractLast(text, pattern, fallback = "") {
  let last = fallback;
  for (const match of text.matchAll(pattern)) {
    last = match[1];
  }
  return last;
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function dedupeUsageEntries(entries) {
  const byId = new Map();
  for (const entry of entries) {
    const id = entry.externalId || `${entry.source}:${entry.timestamp}:${entry.modelId}:${entry.inputTokens}:${entry.outputTokens}`;
    if (!byId.has(id)) byId.set(id, entry);
  }
  return [...byId.values()];
}

function decodeCodexUuidTimestamp(id = "") {
  const hex = String(id).replace(/-/g, "").slice(0, 12);
  if (!/^[0-9a-f]{12}$/i.test(hex)) return 0;
  const timestamp = Number.parseInt(hex, 16);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/* ── JSON Store ── */

class Store {
  constructor() {
    this.path = path.join(app.getPath("userData"), "tokentotal-data.json");
    this.data = { history: [], budget: {}, settings: {} };
    this.load();
    this.migrateSecrets();
  }

  load() {
    try {
      if (fs.existsSync(this.path)) {
        this.data = JSON.parse(fs.readFileSync(this.path, "utf-8"));
      }
    } catch {
      this.data = { history: [], budget: {}, settings: {} };
    }
    if (!Array.isArray(this.data.history)) this.data.history = [];
    if (!this.data.budget || typeof this.data.budget !== "object") this.data.budget = {};
    if (!this.data.settings || typeof this.data.settings !== "object") this.data.settings = {};
  }

  save() {
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("Store save error:", e);
    }
  }

  getHistory() {
    return this.data.history;
  }

  addHistory(entry) {
    this.data.history.push(entry);
    this.save();
  }

  clearHistory() {
    this.data.history = [];
    this.save();
  }

  getBudget() {
    return this.data.budget;
  }

  setBudget(budget) {
    this.data.budget = budget;
    this.save();
  }

  getSettings() {
    const settings = { ...this.data.settings };
    settings.hasOpenAIKey = !!settings.openaiKeyEncrypted || !!settings.openaiKey;
    settings.hasLicenseKey = !!settings.licenseKeyEncrypted || !!settings.licenseKey;
    settings.licenseStatus = this.getLicenseStatus();
    delete settings.openaiKey;
    delete settings.openaiKeyEncrypted;
    delete settings.openaiKeyStorage;
    delete settings.licenseKey;
    delete settings.licenseKeyEncrypted;
    delete settings.licenseKeyStorage;
    return settings;
  }

  setSetting(key, value) {
    if (key === "openaiKey") {
      return this.setOpenAIKey(value);
    }
    if (key === "licenseKey") {
      return this.activateLicense(value);
    }
    this.data.settings[key] = value;
    this.save();
    return { success: true };
  }

  clearSettings() {
    this.data.settings = {};
    this.save();
  }

  clearAllData() {
    const existingSettings = this.data.settings || {};
    const preservedLicense = {};
    ["licenseKey", "licenseKeyEncrypted", "licenseKeyStorage"].forEach((key) => {
      if (existingSettings[key]) preservedLicense[key] = existingSettings[key];
    });
    this.data = { history: [], budget: {}, settings: preservedLicense };
    this.save();
  }

  getAllData() {
    const data = JSON.parse(JSON.stringify(this.data));
    if (data.settings) {
      data.settings.hasOpenAIKey = !!data.settings.openaiKeyEncrypted || !!data.settings.openaiKey;
      data.settings.hasLicenseKey = !!data.settings.licenseKeyEncrypted || !!data.settings.licenseKey;
      data.settings.licenseStatus = this.getLicenseStatus();
      delete data.settings.openaiKey;
      delete data.settings.openaiKeyEncrypted;
      delete data.settings.openaiKeyStorage;
      delete data.settings.licenseKey;
      delete data.settings.licenseKeyEncrypted;
      delete data.settings.licenseKeyStorage;
    }
    return data;
  }

  importHistory(entries) {
    const existing = new Map();
    this.data.history.forEach((entry, index) => {
      if (entry.externalId) existing.set(entry.externalId, index);
    });
    for (const entry of entries) {
      if (entry.externalId && existing.has(entry.externalId)) {
        const index = existing.get(entry.externalId);
        this.data.history[index] = { ...this.data.history[index], ...entry };
        continue;
      }
      this.data.history.push(entry);
      if (entry.externalId) existing.set(entry.externalId, this.data.history.length - 1);
    }
    this.save();
  }

  migrateSecrets() {
    const legacyKey = this.data.settings.openaiKey;
    if (!legacyKey || this.data.settings.openaiKeyEncrypted) return;
    this.setOpenAIKey(legacyKey);
  }

  setOpenAIKey(value) {
    const key = String(value || "").trim();
    delete this.data.settings.openaiKey;

    if (!key) {
      delete this.data.settings.openaiKeyEncrypted;
      delete this.data.settings.openaiKeyStorage;
      this.save();
      return { success: true, hasOpenAIKey: false };
    }

    if (!safeStorage.isEncryptionAvailable()) {
      delete this.data.settings.openaiKeyEncrypted;
      delete this.data.settings.openaiKeyStorage;
      this.save();
      return {
        success: false,
        error: "当前系统不可用安全加密，API Key 未持久化",
        hasOpenAIKey: false,
      };
    }

    const encrypted = safeStorage.encryptString(key).toString("base64");
    this.data.settings.openaiKeyEncrypted = encrypted;
    this.data.settings.openaiKeyStorage = "safeStorage";
    this.save();
    return { success: true, hasOpenAIKey: true };
  }

  getOpenAIKey() {
    const encrypted = this.data.settings.openaiKeyEncrypted;
    if (!encrypted) return "";
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    } catch {
      return "";
    }
  }

  setLicenseKey(value) {
    const licenseKey = normalizeLicenseKey(value);
    delete this.data.settings.licenseKey;

    if (!licenseKey) {
      delete this.data.settings.licenseKeyEncrypted;
      delete this.data.settings.licenseKeyStorage;
      this.save();
      return { success: true, status: freeLicenseStatus("cleared") };
    }

    if (safeStorage.isEncryptionAvailable()) {
      this.data.settings.licenseKeyEncrypted = safeStorage.encryptString(licenseKey).toString("base64");
      this.data.settings.licenseKeyStorage = "safeStorage";
    } else {
      this.data.settings.licenseKey = licenseKey;
      this.data.settings.licenseKeyStorage = "plain";
    }

    this.save();
    return { success: true, status: this.getLicenseStatus() };
  }

  getLicenseKey() {
    const encrypted = this.data.settings.licenseKeyEncrypted;
    if (encrypted) {
      try {
        return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
      } catch {
        return "";
      }
    }
    return this.data.settings.licenseKey || "";
  }

  getLicenseStatus() {
    const licenseKey = this.getLicenseKey();
    if (!licenseKey) return freeLicenseStatus("missing");
    const result = verifyLicenseKey(licenseKey);
    return result.status || freeLicenseStatus("invalid");
  }

  activateLicense(value) {
    const result = verifyLicenseKey(value);
    if (!result.success) return result;
    this.setLicenseKey(value);
    return { success: true, status: this.getLicenseStatus() };
  }

  clearLicense() {
    return this.setLicenseKey("");
  }
}

/* ── PNG Icon Generation (32x32 green T) ── */

function createIconImage() {
  const width = 32;
  const height = 32;
  const rawData = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isBackground =
        x < 3 || x >= 29 || y < 3 || y >= 29 ||
        Math.pow(x < 16 ? 3 - x : x - 28, 2) + Math.pow(y < 16 ? 3 - y : y - 28, 2) > 0;

      // Round corners
      const corners = [
        { cx: 6, cy: 6 },
        { cx: 25, cy: 6 },
        { cx: 6, cy: 25 },
        { cx: 25, cy: 25 },
      ];
      let inRect = x >= 3 && x < 29 && y >= 3 && y < 29;
      let inCorner = false;
      for (const c of corners) {
        const dx = x < c.cx ? c.cx - x : x > c.cx ? x - c.cx : 0;
        const dy = y < c.cy ? c.cy - y : y > c.cy ? y - c.cy : 0;
        if (dx > 0 && dy > 0) {
          if (dx * dx + dy * dy <= 4 * 4) inCorner = true;
          else inRect = false;
        }
      }
      const inShape = inRect || inCorner;

      // T letter shape
      const isT =
        (y >= 8 && y <= 11 && x >= 7 && x <= 24) || // top bar
        (x >= 13 && x <= 18 && y >= 8 && y <= 24);   // vertical bar

      if (inShape) {
        if (isT) {
          // White T
          rawData[idx] = 255;
          rawData[idx + 1] = 255;
          rawData[idx + 2] = 255;
          rawData[idx + 3] = 255;
        } else {
          // Green background (#2f8f83)
          rawData[idx] = 47;
          rawData[idx + 1] = 143;
          rawData[idx + 2] = 131;
          rawData[idx + 3] = 255;
        }
      } else {
        rawData[idx + 3] = 0; // transparent
      }
    }
  }

  return nativeImage.createFromBuffer(
    createPngBuffer(width, height, rawData),
    { width, height }
  );
}

function createPngBuffer(width, height, rawData) {
  // Build raw PNG with filter byte 0 per row
  const rowSize = width * 4 + 1;
  const filtered = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    filtered[y * rowSize] = 0; // filter: none
    rawData.copy(
      filtered,
      y * rowSize + 1,
      y * width * 4,
      (y + 1) * width * 4
    );
  }

  const deflated = zlib.deflateSync(filtered);

  const chunks = [];

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(pngChunk("IHDR", ihdr));

  // IDAT
  chunks.push(pngChunk("IDAT", deflated));

  // IEND
  chunks.push(pngChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeBuffer, data, crcBuf]);
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/* ── App globals ── */

let mainWindow = null;
let tray = null;
let store = null;
let clipboardWatcher = null;
let lastClipboardText = "";
let clipboardEnabled = true;
let usageProxyServer = null;
let usageProxyConfig = null;

/* ── Single instance lock ── */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/* ── Window creation ── */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: createIconImage(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    const settings = store.getSettings();
    if (!settings.startMinimized) {
      mainWindow.show();
    }
  });

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

/* ── Tray ── */

function createTray() {
  const icon = createIconImage();
  tray = new Tray(icon);
  tray.setToolTip("TokenTotal");

  function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "显示 TokenTotal",
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: "separator" },
      {
        label: "剪贴板监控",
        type: "checkbox",
        checked: clipboardEnabled,
        click: (item) => {
          clipboardEnabled = item.checked;
          if (clipboardEnabled) startClipboardWatcher();
          else stopClipboardWatcher();
        },
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  }

  updateTrayMenu();

  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/* ── Clipboard watcher ── */

function startClipboardWatcher() {
  if (clipboardWatcher) return;
  lastClipboardText = clipboard.readText();
  clipboardWatcher = setInterval(() => {
    const current = clipboard.readText();
    if (current && current !== lastClipboardText) {
      lastClipboardText = current;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("clipboard-text", current);
      }
    }
  }, 800);
}

function stopClipboardWatcher() {
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher);
    clipboardWatcher = null;
  }
}

/* ── Local usage scanners ── */

function scanCodexUsage() {
  const root = path.join(app.getPath("home"), ".codex", "sessions");
  const files = walkFiles(root, (filePath) => filePath.endsWith(".jsonl"));
  const entries = [];

  for (const filePath of files) {
    let sessionId = path.basename(filePath, ".jsonl");
    let timestamp = fs.statSync(filePath).mtimeMs;
    let provider = "OpenAI";
    let model = "codex";
    let usage = null;

    readJsonLines(filePath, (event) => {
      if (event.timestamp) {
        const parsed = new Date(event.timestamp).getTime();
        if (Number.isFinite(parsed)) timestamp = parsed;
      }
      if (event.payload?.id) sessionId = event.payload.id;
      if (event.payload?.model_provider) provider = event.payload.model_provider;
      if (event.payload?.model) model = event.payload.model;
      if (event.payload?.collaboration_mode?.settings?.model) {
        model = event.payload.collaboration_mode.settings.model;
      }
      if (event.payload?.info?.total_token_usage) {
        usage = event.payload.info.total_token_usage;
      }
    });

    if (!usage) continue;
    const inputTokens = Number(usage.input_tokens || 0) + Number(usage.cached_input_tokens || 0);
    const cachedInputTokens = Number(usage.cached_input_tokens || 0);
    const outputTokens = Number(usage.output_tokens || 0) + Number(usage.reasoning_output_tokens || 0);
    if (inputTokens + outputTokens === 0) continue;
    const costInfo = calculateUsageCost({ model, provider, inputTokens, cachedInputTokens, outputTokens });

    entries.push({
      timestamp,
      model: costInfo.displayModel || model,
      modelId: model,
      provider: costInfo.provider || provider,
      source: "Codex",
      externalId: `codex:${sessionId}`,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      cost: costInfo.cost,
      cacheRatio: inputTokens > 0 ? cachedInputTokens / inputTokens : 0,
    });
  }

  const desktopEntries = scanCodexDesktopLogUsage();
  const exactTotalsByTurn = new Map();
  for (const entry of desktopEntries) {
    if (!entry.turnId) continue;
    exactTotalsByTurn.set(
      entry.turnId,
      (exactTotalsByTurn.get(entry.turnId) || 0) + Number(entry.inputTokens || 0) + Number(entry.outputTokens || 0)
    );
  }

  return dedupeUsageEntries([...entries, ...desktopEntries, ...scanCodexObservedTotalUsage(exactTotalsByTurn)]);
}

function scanCodexDesktopLogUsage() {
  const root = path.join(app.getPath("home"), ".codex");
  if (!fs.existsSync(root)) return [];

  let files = [];
  try {
    files = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((item) => item.isFile() && /^logs.*\.sqlite(?:-wal)?$/i.test(item.name))
      .map((item) => path.join(root, item.name));
  } catch {
    return [];
  }

  const entriesById = new Map();
  const eventPattern = /event\.name="codex\.sse_event"[\s\S]{0,3000}?codex_otel::events::session_telemetry/g;

  for (const filePath of files) {
    const text = readTextBestEffort(filePath);
    if (!text.includes('event.name="codex.sse_event"')) continue;

    let stats = null;
    try {
      stats = fs.statSync(filePath);
    } catch {
      stats = { mtimeMs: Date.now() };
    }

    for (const match of text.matchAll(eventPattern)) {
      const eventText = match[0];
      if (!/event\.kind=response\.completed/.test(eventText)) continue;
      const prefix = text.slice(Math.max(0, match.index - 2500), match.index);
      const turnId = extractLast(prefix, /turn\.id=([0-9a-f-]+)/g);

      const inputTokens = toFiniteNumber(extractFirst(eventText, /\binput_token_count=(\d+)/));
      const cachedInputTokens = toFiniteNumber(extractFirst(eventText, /\bcached_token_count=(\d+)/));
      const outputTokens =
        toFiniteNumber(extractFirst(eventText, /\boutput_token_count=(\d+)/)) +
        toFiniteNumber(extractFirst(eventText, /\breasoning_token_count=(\d+)/));
      if (inputTokens + outputTokens === 0) continue;

      const timestampText = extractFirst(eventText, /\bevent\.timestamp=([^\s\0]+)/);
      const parsedTimestamp = new Date(timestampText).getTime();
      const timestamp = Number.isFinite(parsedTimestamp) ? parsedTimestamp : stats.mtimeMs;
      const conversationId = extractFirst(eventText, /\bconversation\.id=([0-9a-f-]+)/i, "unknown");
      const model =
        extractFirst(eventText, /\bmodel="?([^"\s\0]+)"?/) ||
        extractFirst(eventText, /\bslug="?([^"\s\0]+)"?/) ||
        "codex";
      const provider = /claude/i.test(model) ? "Anthropic" : "OpenAI";
      const externalId = `codex-desktop:${conversationId}:${timestamp}:${model}:${inputTokens}:${cachedInputTokens}:${outputTokens}`;
      if (entriesById.has(externalId)) continue;

      const costInfo = calculateUsageCost({ model, provider, inputTokens, cachedInputTokens, outputTokens });
      entriesById.set(externalId, {
        timestamp,
        model: costInfo.displayModel || model,
        modelId: model,
        provider: costInfo.provider || provider,
        source: "Codex",
        externalId,
        turnId,
        confidence: "exact",
        inputTokens,
        cachedInputTokens,
        outputTokens,
        cost: costInfo.cost,
        cacheRatio: inputTokens > 0 ? cachedInputTokens / inputTokens : 0,
      });
    }
  }

  return [...entriesById.values()];
}

function scanCodexObservedTotalUsage(exactTotalsByTurn = new Map()) {
  const root = path.join(app.getPath("home"), ".codex");
  if (!fs.existsSync(root)) return [];

  let files = [];
  try {
    files = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((item) => item.isFile() && /^logs.*\.sqlite(?:-wal)?$/i.test(item.name))
      .map((item) => path.join(root, item.name));
  } catch {
    return [];
  }

  const entriesById = new Map();
  const observedPattern = /post sampling token usage turn_id=([0-9a-f-]+) total_usage_tokens=(\d+) estimated_token_count=Some\((\d+)\)/g;

  for (const filePath of files) {
    const text = readTextBestEffort(filePath);
    if (!text.includes("post sampling token usage")) continue;

    let stats = null;
    try {
      stats = fs.statSync(filePath);
    } catch {
      stats = { mtimeMs: Date.now() };
    }

    for (const match of text.matchAll(observedPattern)) {
      const turnId = match[1];
      const totalUsageTokens = toFiniteNumber(match[2]);
      const estimatedTokenCount = toFiniteNumber(match[3]);
      const exactCoveredTokens = toFiniteNumber(exactTotalsByTurn.get(turnId));
      const observedTokens = Math.max(0, totalUsageTokens - exactCoveredTokens);
      if (observedTokens < Math.max(64, totalUsageTokens * 0.02)) continue;

      const context = text.slice(Math.max(0, match.index - 2500), match.index + 500);
      const timestamp = decodeCodexUuidTimestamp(turnId) || stats.mtimeMs;
      const model = extractLast(context, /\bmodel=([^\s}]+)/g, "codex");
      const provider = /claude/i.test(model) ? "Anthropic" : "OpenAI";
      const costInfo = calculateUsageCost({
        model,
        provider,
        inputTokens: observedTokens,
        cachedInputTokens: 0,
        outputTokens: 0,
      });
      const externalId = `codex-observed:${turnId}`;
      entriesById.set(externalId, {
        timestamp,
        model: `${costInfo.displayModel || model} · observed`,
        modelId: model,
        provider: costInfo.provider || provider,
        source: "Codex",
        externalId,
        turnId,
        confidence: "observed",
        estimateMode: exactCoveredTokens ? "Codex total-only delta" : "Codex total-only",
        inputTokens: observedTokens,
        cachedInputTokens: 0,
        outputTokens: 0,
        cost: costInfo.cost,
        cacheRatio: 0,
        observedOnly: true,
        observedTotalTokens: totalUsageTokens,
        exactCoveredTokens,
        estimatedTokenCount,
      });
    }
  }

  return [...entriesById.values()];
}

function auditCodexDesktopLogs() {
  const root = path.join(app.getPath("home"), ".codex");
  const audit = {
    files: [],
    exact: { records: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, totalTokens: 0 },
    observedTotal: { records: 0, totalUsageTokens: 0, estimatedTokenCount: 0, latestTimestamp: 0 },
  };
  if (!fs.existsSync(root)) return audit;

  let files = [];
  try {
    files = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((item) => item.isFile() && /^logs.*\.sqlite(?:-wal)?$/i.test(item.name))
      .map((item) => path.join(root, item.name));
  } catch {
    return audit;
  }

  audit.files = files.map((filePath) => path.basename(filePath));
  const exactIds = new Set();
  const observedIds = new Set();
  const eventPattern = /event\.name="codex\.sse_event"[\s\S]{0,3000}?codex_otel::events::session_telemetry/g;
  const observedPattern = /post sampling token usage turn_id=([0-9a-f-]+) total_usage_tokens=(\d+) estimated_token_count=Some\((\d+)\)/g;

  for (const filePath of files) {
    const text = readTextBestEffort(filePath);
    if (!text) continue;

    for (const match of text.matchAll(eventPattern)) {
      const eventText = match[0];
      if (!/event\.kind=response\.completed/.test(eventText)) continue;
      const inputTokens = toFiniteNumber(extractFirst(eventText, /\binput_token_count=(\d+)/));
      const cachedInputTokens = toFiniteNumber(extractFirst(eventText, /\bcached_token_count=(\d+)/));
      const outputTokens =
        toFiniteNumber(extractFirst(eventText, /\boutput_token_count=(\d+)/)) +
        toFiniteNumber(extractFirst(eventText, /\breasoning_token_count=(\d+)/));
      const timestampText = extractFirst(eventText, /\bevent\.timestamp=([^\s\0]+)/);
      const conversationId = extractFirst(eventText, /\bconversation\.id=([0-9a-f-]+)/i, "unknown");
      const model = extractFirst(eventText, /\bmodel="?([^"\s\0]+)"?/) || "codex";
      const id = `${conversationId}:${timestampText}:${model}:${inputTokens}:${cachedInputTokens}:${outputTokens}`;
      if (inputTokens + outputTokens === 0 || exactIds.has(id)) continue;
      exactIds.add(id);
      audit.exact.records += 1;
      audit.exact.inputTokens += inputTokens;
      audit.exact.cachedInputTokens += cachedInputTokens;
      audit.exact.outputTokens += outputTokens;
      audit.exact.totalTokens += inputTokens + outputTokens;
    }

    for (const match of text.matchAll(observedPattern)) {
      const turnId = match[1];
      if (observedIds.has(turnId)) continue;
      observedIds.add(turnId);
      audit.observedTotal.latestTimestamp = Math.max(audit.observedTotal.latestTimestamp, decodeCodexUuidTimestamp(turnId));
      audit.observedTotal.records += 1;
      audit.observedTotal.totalUsageTokens += toFiniteNumber(match[2]);
      audit.observedTotal.estimatedTokenCount += toFiniteNumber(match[3]);
    }
  }

  return audit;
}

function scanClaudeUsage() {
  const root = path.join(app.getPath("home"), ".claude", "projects");
  const files = walkFiles(root, (filePath) => filePath.endsWith(".jsonl"));
  const entries = [];

  for (const filePath of files) {
    const stats = fs.statSync(filePath);
    let timestamp = stats.mtimeMs;
    let sessionId = path.basename(filePath, ".jsonl");
    let model = "claude";
    let inputTokens = 0;
    let cacheCreationTokens = 0;
    let cacheReadTokens = 0;
    let outputTokens = 0;

    readJsonLines(filePath, (event) => {
      if (event.sessionId) sessionId = event.sessionId;
      if (event.timestamp) {
        const parsed = new Date(event.timestamp).getTime();
        if (Number.isFinite(parsed)) timestamp = parsed;
      }
      const message = event.message;
      if (!message?.usage) return;
      if (message.model && message.model !== "<synthetic>") model = message.model;
      inputTokens += Number(message.usage.input_tokens || 0);
      cacheCreationTokens += Number(message.usage.cache_creation_input_tokens || 0);
      cacheReadTokens += Number(message.usage.cache_read_input_tokens || 0);
      outputTokens += Number(message.usage.output_tokens || 0);
    });

    const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
    if (totalInputTokens + outputTokens === 0) continue;
    const costInfo = calculateUsageCost({
      model,
      provider: "Anthropic",
      inputTokens: totalInputTokens,
      cachedInputTokens: cacheReadTokens,
      outputTokens,
    });

    entries.push({
      timestamp,
      model: costInfo.displayModel || model,
      modelId: model,
      provider: costInfo.provider || "Anthropic",
      source: "Claude Code",
      externalId: `claude:${sessionId}:${path.relative(root, filePath)}`,
      inputTokens: totalInputTokens,
      cachedInputTokens: cacheReadTokens,
      outputTokens,
      cost: costInfo.cost,
      cacheRatio: totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0,
    });
  }

  return entries;
}

function scanLocalUsage(source) {
  if (source === "codex") return scanCodexUsage();
  if (source === "claude") return scanClaudeUsage();
  return [...scanCodexUsage(), ...scanClaudeUsage()];
}

/* ── Usage proxy ── */

function normalizeProxyConfig(config = {}) {
  const port = Math.max(1024, Math.min(65535, Number(config.port) || 8787));
  const targetBaseUrl = String(config.targetBaseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const provider = config.provider || detectProviderFromUrl(targetBaseUrl);
  return {
    port,
    host: "127.0.0.1",
    targetBaseUrl,
    provider,
  };
}

function getUsageProxyStatus() {
  return {
    running: !!usageProxyServer,
    config: usageProxyConfig || normalizeProxyConfig(store?.getSettings().proxy || {}),
    proxyBaseUrl: usageProxyConfig ? `http://${usageProxyConfig.host}:${usageProxyConfig.port}` : "",
  };
}

function getLocalOllamaConfig() {
  const saved = store?.getSettings().proxy || {};
  const savedTarget = String(saved.targetBaseUrl || "");
  const targetBaseUrl =
    saved.provider === "Local" || detectProviderFromUrl(savedTarget) === "Local"
      ? savedTarget
      : "http://127.0.0.1:11434";
  return normalizeProxyConfig({
    port: saved.port || 8787,
    targetBaseUrl,
    provider: "Local",
  });
}

function requestJson({ method = "GET", baseUrl, requestPath, body, headers = {}, timeoutMs = 180000 }) {
  return new Promise((resolve) => {
    let targetUrl;
    try {
      targetUrl = new URL(requestPath, String(baseUrl || "").replace(/\/+$/, "") + "/");
    } catch (error) {
      resolve({ success: false, error: `无效地址: ${error.message}` });
      return;
    }

    const transport = targetUrl.protocol === "https:" ? https : http;
    const bodyBuffer =
      body === undefined || body === null
        ? Buffer.alloc(0)
        : Buffer.from(JSON.stringify(body), "utf-8");
    const requestHeaders = {
      accept: "application/json",
      ...headers,
    };
    if (bodyBuffer.length > 0) {
      requestHeaders["content-type"] = "application/json";
      requestHeaders["content-length"] = bodyBuffer.length;
    }

    const req = transport.request(
      targetUrl,
      {
        method,
        headers: requestHeaders,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf-8");
          const data = parseJsonSafe(text);
          if ((res.statusCode || 0) < 200 || (res.statusCode || 0) >= 300) {
            resolve({
              success: false,
              statusCode: res.statusCode || 0,
              error: data?.error?.message || data?.error || text || `HTTP ${res.statusCode}`,
              data,
              text,
            });
            return;
          }
          resolve({ success: true, statusCode: res.statusCode || 0, data, text });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("请求超时"));
    });
    req.on("error", (error) => {
      resolve({ success: false, error: error.message });
    });
    if (bodyBuffer.length > 0) req.write(bodyBuffer);
    req.end();
  });
}

async function listOllamaModels() {
  const config = getLocalOllamaConfig();
  const result = await requestJson({
    baseUrl: config.targetBaseUrl,
    requestPath: "/api/tags",
    timeoutMs: 15000,
  });
  if (!result.success) {
    return { success: false, error: result.error, models: [], targetBaseUrl: config.targetBaseUrl };
  }
  const models = Array.isArray(result.data?.models)
    ? result.data.models.map((item) => ({
        name: item.name || item.model || "",
        model: item.model || item.name || "",
        size: item.size || 0,
        modifiedAt: item.modified_at || "",
      })).filter((item) => item.name)
    : [];
  return { success: true, models, targetBaseUrl: config.targetBaseUrl };
}

async function ensureLocalOllamaProxy() {
  const desired = getLocalOllamaConfig();
  const isAlreadyLocal =
    usageProxyServer &&
    usageProxyConfig?.provider === "Local" &&
    usageProxyConfig?.targetBaseUrl === desired.targetBaseUrl &&
    usageProxyConfig?.port === desired.port;
  if (!isAlreadyLocal) {
    const status = await startUsageProxy(desired);
    if (status.error) return status;
  }
  return getUsageProxyStatus();
}

async function sendLocalChat(payload = {}) {
  const model = String(payload.model || "").trim();
  if (!model) return { success: false, error: "请先选择或填写一个 Ollama 模型" };

  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .filter((message) => message && typeof message.content === "string" && message.content.trim())
        .map((message) => ({
          role: ["system", "user", "assistant"].includes(message.role) ? message.role : "user",
          content: message.content,
        }))
    : [];
  if (messages.length === 0) return { success: false, error: "请输入消息" };

  const temperature = Number(payload.temperature);
  const options = {};
  if (Number.isFinite(temperature)) {
    options.temperature = Math.max(0, Math.min(2, temperature));
  }

  const status = await ensureLocalOllamaProxy();
  if (status.error) {
    return { success: false, error: status.error, proxyStatus: status };
  }
  const result = await requestJson({
    method: "POST",
    baseUrl: status.proxyBaseUrl,
    requestPath: "/api/chat",
    body: {
      model,
      messages,
      stream: false,
      options,
    },
    timeoutMs: 300000,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error || "本地模型请求失败",
      proxyStatus: getUsageProxyStatus(),
    };
  }

  const data = result.data || {};
  const outputTokens = Number(data.eval_count || 0);
  const evalSeconds = Number(data.eval_duration || 0) / 1_000_000_000;
  return {
    success: true,
    message: data.message?.content || data.response || "",
    raw: data,
    usage: {
      inputTokens: Number(data.prompt_eval_count || 0),
      outputTokens,
      totalDurationMs: Math.round(Number(data.total_duration || 0) / 1_000_000),
      loadDurationMs: Math.round(Number(data.load_duration || 0) / 1_000_000),
      promptDurationMs: Math.round(Number(data.prompt_eval_duration || 0) / 1_000_000),
      evalDurationMs: Math.round(Number(data.eval_duration || 0) / 1_000_000),
      tokensPerSecond: evalSeconds > 0 ? outputTokens / evalSeconds : 0,
    },
    proxyStatus: getUsageProxyStatus(),
  };
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractSseUsage(text) {
  let usage = null;
  let model = "";
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    const parsed = parseJsonSafe(data);
    if (!parsed) continue;
    if (parsed.model) model = parsed.model;
    if (parsed.usage) usage = parsed.usage;
  }
  return usage ? { usage, model } : null;
}

function extractOllamaUsage(text) {
  const parsed = parseJsonSafe(text);
  if (parsed?.prompt_eval_count || parsed?.eval_count) return parsed;

  let finalChunk = null;
  for (const line of text.split(/\r?\n/)) {
    const parsedLine = parseJsonSafe(line.trim());
    if (parsedLine?.done) finalChunk = parsedLine;
  }
  return finalChunk?.prompt_eval_count || finalChunk?.eval_count ? finalChunk : null;
}

function buildUsageEntry({ requestBody, responseBody, requestPath, targetBaseUrl, providerHint, statusCode }) {
  if (statusCode < 200 || statusCode >= 300) return null;

  const requestJson = parseJsonSafe(requestBody);
  const responseJson = parseJsonSafe(responseBody);
  const provider = providerHint || detectProviderFromUrl(targetBaseUrl);
  let model = responseJson?.model || requestJson?.model || "unknown";
  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  let source = "Proxy";

  if (responseJson?.usage?.prompt_tokens != null || responseJson?.usage?.completion_tokens != null) {
    inputTokens = Number(responseJson.usage.prompt_tokens || 0);
    cachedInputTokens = Number(responseJson.usage.prompt_tokens_details?.cached_tokens || 0);
    outputTokens = Number(responseJson.usage.completion_tokens || 0);
    source = "Proxy OpenAI";
  } else if (responseJson?.usage?.input_tokens != null || responseJson?.usage?.output_tokens != null) {
    const usage = responseJson.usage;
    cachedInputTokens = Number(usage.cache_read_input_tokens || 0);
    inputTokens =
      Number(usage.input_tokens || 0) +
      Number(usage.cache_creation_input_tokens || 0) +
      cachedInputTokens;
    outputTokens = Number(usage.output_tokens || 0);
    source = "Proxy Anthropic";
  } else {
    const sse = extractSseUsage(responseBody);
    if (sse?.usage) {
      model = sse.model || model;
      inputTokens = Number(sse.usage.prompt_tokens || sse.usage.input_tokens || 0);
      cachedInputTokens = Number(sse.usage.prompt_tokens_details?.cached_tokens || sse.usage.cache_read_input_tokens || 0);
      outputTokens = Number(sse.usage.completion_tokens || sse.usage.output_tokens || 0);
      source = "Proxy Stream";
    } else {
      const ollama = /\/api\/(chat|generate|completion)/.test(requestPath) ? extractOllamaUsage(responseBody) : null;
      if (ollama) {
        model = ollama.model || model;
        inputTokens = Number(ollama.prompt_eval_count || 0);
        outputTokens = Number(ollama.eval_count || 0);
        source = "Proxy Ollama";
      }
    }
  }

  if (inputTokens + outputTokens === 0) return null;
  const costInfo = calculateUsageCost({ model, provider, inputTokens, cachedInputTokens, outputTokens });
  const now = Date.now();

  return {
    timestamp: now,
    model: costInfo.displayModel || model,
    modelId: model,
    provider: costInfo.provider || provider,
    source,
    externalId: `proxy:${now}:${Math.random().toString(36).slice(2, 10)}`,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    cost: costInfo.cost,
    cacheRatio: inputTokens > 0 ? cachedInputTokens / inputTokens : 0,
    proxyTarget: targetBaseUrl,
  };
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "authorization,content-type,anthropic-version,x-api-key");
}

function closeUsageProxyServer() {
  return new Promise((resolve) => {
    if (!usageProxyServer) {
      resolve();
      return;
    }
    const server = usageProxyServer;
    usageProxyServer = null;
    usageProxyConfig = null;
    server.close(() => resolve());
  });
}

async function startUsageProxy(config) {
  const nextConfig = normalizeProxyConfig(config);
  if (usageProxyServer) await closeUsageProxyServer();

  const server = http.createServer((clientReq, clientRes) => {
    setCorsHeaders(clientRes);
    if (clientReq.method === "OPTIONS") {
      clientRes.writeHead(204);
      clientRes.end();
      return;
    }

    if (clientReq.url === "/__tokentotal/status") {
      clientRes.writeHead(200, { "content-type": "application/json" });
      clientRes.end(JSON.stringify(getUsageProxyStatus()));
      return;
    }

    const requestChunks = [];
    clientReq.on("data", (chunk) => requestChunks.push(chunk));
    clientReq.on("end", () => {
      const requestBodyBuffer = Buffer.concat(requestChunks);
      const requestBody = requestBodyBuffer.toString("utf-8");
      let targetUrl;
      try {
        targetUrl = new URL(clientReq.url, nextConfig.targetBaseUrl);
      } catch (error) {
        clientRes.writeHead(400, { "content-type": "application/json" });
        clientRes.end(JSON.stringify({ error: `Invalid proxy target: ${error.message}` }));
        return;
      }
      const transport = targetUrl.protocol === "https:" ? https : http;
      const headers = { ...clientReq.headers, host: targetUrl.host };
      headers["content-length"] = requestBodyBuffer.length;
      headers["accept-encoding"] = "identity";
      delete headers.connection;

      const upstreamReq = transport.request(
        targetUrl,
        {
          method: clientReq.method,
          headers,
        },
        (upstreamRes) => {
          const responseChunks = [];
          const responseHeaders = { ...upstreamRes.headers };
          delete responseHeaders["content-length"];
          clientRes.writeHead(upstreamRes.statusCode || 502, responseHeaders);
          upstreamRes.on("data", (chunk) => {
            responseChunks.push(chunk);
            clientRes.write(chunk);
          });
          upstreamRes.on("end", () => {
            clientRes.end();
            const responseBody = Buffer.concat(responseChunks).toString("utf-8");
            const entry = buildUsageEntry({
              requestBody,
              responseBody,
              requestPath: targetUrl.pathname,
              targetBaseUrl: nextConfig.targetBaseUrl,
              providerHint: nextConfig.provider,
              statusCode: upstreamRes.statusCode || 0,
            });
            if (entry && store) store.addHistory(entry);
          });
        }
      );

      upstreamReq.on("error", (error) => {
        clientRes.writeHead(502, { "content-type": "application/json" });
        clientRes.end(JSON.stringify({ error: error.message }));
      });

      if (requestBodyBuffer.length > 0) upstreamReq.write(requestBodyBuffer);
      upstreamReq.end();
    });
  });

  return await new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const handleListenError = (error) => {
      if (usageProxyServer === server) usageProxyServer = null;
      usageProxyConfig = null;
      const existing = store?.data?.settings?.proxy || {};
      if (store) store.setSetting("proxy", { ...existing, ...nextConfig, enabled: false });
      const message = error.code === "EADDRINUSE"
        ? `端口 ${nextConfig.port} 已被占用，请换一个监听端口`
        : error.message;
      finish({ ...getUsageProxyStatus(), error: message });
    };

    server.once("error", handleListenError);

    server.listen(nextConfig.port, nextConfig.host, () => {
      server.off("error", handleListenError);
      server.on("error", (error) => {
        console.error("Usage proxy runtime error:", error);
      });
      usageProxyServer = server;
      usageProxyConfig = nextConfig;
      store.setSetting("proxy", { ...nextConfig, enabled: true });
      finish(getUsageProxyStatus());
    });
  });
}

async function stopUsageProxy() {
  await closeUsageProxyServer();
  const existing = store?.getSettings().proxy || {};
  if (store) store.setSetting("proxy", { ...existing, enabled: false });
  return getUsageProxyStatus();
}

/* ── IPC handlers ── */

async function openPurchasePage() {
  try {
    const url = new URL(PURCHASE_URL);
    if (!/^https?:$/.test(url.protocol)) {
      return { success: false, error: "购买链接不是有效的网页地址" };
    }
    await shell.openExternal(url.toString());
    return { success: true, url: url.toString() };
  } catch {
    return { success: false, error: "购买链接未配置或格式不正确" };
  }
}

function requireProIPC(feature) {
  const status = store?.getLicenseStatus();
  if (status?.isPro) return null;
  return {
    success: false,
    requiresPro: true,
    feature,
    error: "该功能需要 TokenTotal Pro",
    licenseStatus: status || freeLicenseStatus("missing"),
  };
}

function setupIPC() {
  ipcMain.handle("get-history", () => store.getHistory());
  ipcMain.handle("add-history", (_, entry) => {
    store.addHistory(entry);
    return true;
  });
  ipcMain.handle("clear-history", () => {
    store.clearHistory();
    return true;
  });
  ipcMain.handle("get-budget", () => store.getBudget());
  ipcMain.handle("set-budget", (_, budget) => {
    store.setBudget(budget);
    return true;
  });
  ipcMain.handle("get-settings", () => store.getSettings());
  ipcMain.handle("get-license-status", () => store.getLicenseStatus());
  ipcMain.handle("activate-license", (_, licenseKey) => store.activateLicense(licenseKey));
  ipcMain.handle("deactivate-license", () => store.clearLicense());
  ipcMain.handle("open-purchase-page", () => openPurchasePage());
  ipcMain.handle("set-setting", (_, key, value) => {
    const result = store.setSetting(key, value);
    if (key === "clipboardWatch") {
      clipboardEnabled = !!value;
      if (clipboardEnabled) startClipboardWatcher();
      else stopClipboardWatcher();
    }
    return result || true;
  });
  ipcMain.handle("clear-settings", () => {
    store.clearSettings();
    return true;
  });
  ipcMain.handle("clear-all-data", async () => {
    await stopUsageProxy();
    store.clearAllData();
    return true;
  });
  ipcMain.handle("get-all-data", () => store.getAllData());
  ipcMain.handle("import-history", (_, entries) => {
    store.importHistory(entries);
    return true;
  });
  ipcMain.handle("scan-local-usage", (_, source) => {
    const blocked = requireProIPC("connectors");
    if (blocked) return { ...blocked, source, scanned: 0, imported: 0 };
    const entries = scanLocalUsage(source);
    const audit =
      source === "codex"
        ? { codex: auditCodexDesktopLogs() }
        : source === "all"
          ? { codex: auditCodexDesktopLogs() }
          : null;
    const before = store.getHistory().length;
    store.importHistory(entries);
    const after = store.getHistory().length;
    return {
      success: true,
      source,
      scanned: entries.length,
      imported: after - before,
      audit,
    };
  });
  ipcMain.handle("get-proxy-status", () => getUsageProxyStatus());
  ipcMain.handle("start-proxy", (_, config) => {
    const blocked = requireProIPC("connectors");
    if (blocked) return { ...getUsageProxyStatus(), ...blocked };
    return startUsageProxy(config);
  });
  ipcMain.handle("stop-proxy", () => stopUsageProxy());
  ipcMain.handle("list-ollama-models", () => listOllamaModels());
  ipcMain.handle("send-local-chat", (_, payload) => {
    const blocked = requireProIPC("localChat");
    if (blocked) return blocked;
    return sendLocalChat(payload);
  });
  ipcMain.handle("fetch-openai-usage", async (_, apiKey) => {
    const blocked = requireProIPC("cloudUsage");
    if (blocked) return blocked;
    try {
      const key = String(apiKey || store.getOpenAIKey() || "").trim();
      if (!key) {
        return { success: false, error: "请先填入 API Key" };
      }
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      return await new Promise((resolve, reject) => {
        const request = net.request({
          method: "GET",
          url: `https://api.openai.com/v1/usage?start_date=${startDate}&end_date=${endDate}`,
        });
        request.setHeader("Authorization", `Bearer ${key}`);
        request.setHeader("Content-Type", "application/json");

        let body = "";
        request.on("response", (response) => {
          response.on("data", (chunk) => {
            body += chunk.toString();
          });
          response.on("end", () => {
            try {
              resolve({ success: true, data: JSON.parse(body) });
            } catch {
              resolve({ success: false, error: "Invalid response" });
            }
          });
        });
        request.on("error", (err) => {
          resolve({ success: false, error: err.message });
        });
        request.end();
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

/* ── App lifecycle ── */

app.whenReady().then(() => {
  store = new Store();
  setupIPC();
  createWindow();
  createTray();

  // Apply settings
  const settings = store.getSettings();
  clipboardEnabled = settings.clipboardWatch !== false;
  if (clipboardEnabled) startClipboardWatcher();
  if (settings.proxy?.enabled) {
    startUsageProxy(settings.proxy).then((status) => {
      if (status.error) console.error("Usage proxy start error:", status.error);
    });
  }

  // Global shortcut
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopClipboardWatcher();
  if (usageProxyServer) {
    usageProxyServer.close();
    usageProxyServer = null;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Don't quit — tray keeps it alive
  }
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
