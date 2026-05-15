const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");

const HOST = process.env.TT_PAY_HOST || "127.0.0.1";
const PORT = Number(process.env.TT_PAY_PORT || 8788);
const PUBLIC_BASE_URL = (process.env.TT_PUBLIC_BASE_URL || `http://${HOST}:${PORT}`).replace(/\/$/, "");
const PAYMENT_MODE = process.env.TT_PAYMENT_MODE || (hasWechatConfig() ? "wechat" : "mock");
const DATA_DIR = path.join(__dirname, "data");
const ORDER_FILE = path.join(DATA_DIR, "orders.json");

const PLANS = {
  pro: {
    plan: "pro",
    name: process.env.TT_PRO_NAME || "TokenTotal Pro",
    description: process.env.TT_PRO_DESCRIPTION || "TokenTotal Pro License",
    amountFen: Number(process.env.TT_PRO_PRICE_FEN || 9900),
    currency: "CNY",
  },
};

const PRO_FEATURES = [
  "connectors",
  "localChat",
  "promptEnglish",
  "cloudUsage",
  "exportData",
  "unlimitedHistory",
];

function hasWechatConfig() {
  return !!(
    process.env.WECHAT_APPID &&
    process.env.WECHAT_MCHID &&
    process.env.WECHAT_MERCHANT_SERIAL_NO &&
    (process.env.WECHAT_MERCHANT_PRIVATE_KEY || process.env.WECHAT_MERCHANT_PRIVATE_KEY_PATH) &&
    process.env.WECHAT_API_V3_KEY &&
    (process.env.WECHAT_PAY_PUBLIC_KEY || process.env.WECHAT_PAY_PUBLIC_KEY_PATH)
  );
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function loadOrders() {
  return readJsonFile(ORDER_FILE, []);
}

function saveOrders(orders) {
  writeJsonFile(ORDER_FILE, orders);
}

function updateOrder(orderId, updater) {
  const orders = loadOrders();
  const index = orders.findIndex((order) => order.id === orderId || order.outTradeNo === orderId);
  if (index === -1) return null;
  orders[index] = updater(orders[index]);
  saveOrders(orders);
  return orders[index];
}

function findOrder(orderId) {
  return loadOrders().find((order) => order.id === orderId || order.outTradeNo === orderId) || null;
}

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
}

function formatBeijingRfc3339(date) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, "+08:00");
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readSecret(name, fileName) {
  const inline = process.env[name];
  if (inline) return inline.replace(/\\n/g, "\n");
  const file = process.env[fileName];
  if (file) return fs.readFileSync(file, "utf8");
  return "";
}

function signPayload(payloadPart, privateKey) {
  const data = Buffer.from(payloadPart, "utf8");
  try {
    return crypto.sign(null, data, privateKey);
  } catch {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(data);
    signer.end();
    return signer.sign(privateKey);
  }
}

function createLicense(order) {
  const privateKey = readSecret("TOKENTOTAL_LICENSE_PRIVATE_KEY", "TOKENTOTAL_LICENSE_PRIVATE_KEY_PATH");
  if (!privateKey && PAYMENT_MODE === "mock") return "TT-DEV-PRO";
  if (!privateKey) {
    throw new Error("Missing TOKENTOTAL_LICENSE_PRIVATE_KEY or TOKENTOTAL_LICENSE_PRIVATE_KEY_PATH");
  }

  const payload = {
    product: "tokentotal",
    plan: order.plan,
    licenseId: randomId("lic"),
    email: order.email || "",
    customerName: order.customerName || "",
    orderId: order.id,
    outTradeNo: order.outTradeNo,
    issuedAt: new Date().toISOString(),
    features: PRO_FEATURES,
  };
  const payloadPart = base64Url(JSON.stringify(payload));
  const signaturePart = base64Url(signPayload(payloadPart, privateKey));
  return `TT-PRO-${payloadPart}.${signaturePart}`;
}

function buildWechatAuthorization(method, urlPath, body) {
  const mchid = process.env.WECHAT_MCHID;
  const serialNo = process.env.WECHAT_MERCHANT_SERIAL_NO;
  const privateKey = readSecret("WECHAT_MERCHANT_PRIVATE_KEY", "WECHAT_MERCHANT_PRIVATE_KEY_PATH");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  const signature = signer.sign(privateKey, "base64");
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
}

function verifyWechatSignature(headers, rawBody) {
  const publicKey = readSecret("WECHAT_PAY_PUBLIC_KEY", "WECHAT_PAY_PUBLIC_KEY_PATH");
  const timestamp = headers["wechatpay-timestamp"];
  const nonce = headers["wechatpay-nonce"];
  const signature = headers["wechatpay-signature"];
  const serial = headers["wechatpay-serial"];
  const expectedSerial = process.env.WECHAT_PAY_PUBLIC_KEY_ID || process.env.WECHAT_PLATFORM_SERIAL_NO || "";
  if (!publicKey || !timestamp || !nonce || !signature) return false;
  if (expectedSerial && serial && serial !== expectedSerial) return false;

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${timestamp}\n${nonce}\n${rawBody}\n`);
  verifier.end();
  return verifier.verify(publicKey, signature, "base64");
}

function decryptWechatResource(resource) {
  const apiV3Key = process.env.WECHAT_API_V3_KEY || "";
  if (Buffer.byteLength(apiV3Key) !== 32) {
    throw new Error("WECHAT_API_V3_KEY must be 32 bytes");
  }
  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key), Buffer.from(resource.nonce));
  if (resource.associated_data) decipher.setAAD(Buffer.from(resource.associated_data));
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext);
}

function requestWechatNativePrepay(order) {
  const body = JSON.stringify({
    appid: process.env.WECHAT_APPID,
    mchid: process.env.WECHAT_MCHID,
    description: order.description.slice(0, 127),
    out_trade_no: order.outTradeNo,
    time_expire: order.expiresAt,
    notify_url: `${PUBLIC_BASE_URL}/api/wechat/notify`,
    attach: order.id,
    amount: {
      total: order.amountFen,
      currency: order.currency,
    },
  });
  const urlPath = "/v3/pay/transactions/native";

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: "POST",
        hostname: "api.mch.weixin.qq.com",
        path: urlPath,
        headers: {
          Authorization: buildWechatAuthorization("POST", urlPath, body),
          Accept: "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { raw += chunk; });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`WeChat Pay ${res.statusCode}: ${raw}`));
            return;
          }
          if (!verifyWechatSignature(res.headers, raw)) {
            reject(new Error("WeChat Pay response signature verification failed"));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error("WeChat Pay response is not valid JSON"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function createOrder(payload) {
  const plan = PLANS[payload.plan || "pro"];
  if (!plan) throw new Error("Unknown plan");
  const order = {
    id: randomId("ord"),
    outTradeNo: randomId("tt").replace(/[^0-9a-zA-Z_-]/g, "").slice(0, 32),
    plan: plan.plan,
    description: plan.description,
    amountFen: plan.amountFen,
    currency: plan.currency,
    email: String(payload.email || "").trim(),
    customerName: String(payload.customerName || "").trim(),
    status: PAYMENT_MODE === "mock" ? "pending_mock" : "pending",
    mode: PAYMENT_MODE,
    createdAt: new Date().toISOString(),
    expiresAt: formatBeijingRfc3339(new Date(Date.now() + 15 * 60 * 1000)),
    codeUrl: "",
    licenseKey: "",
  };

  if (PAYMENT_MODE === "wechat") {
    const result = await requestWechatNativePrepay(order);
    order.codeUrl = result.code_url;
  } else {
    order.codeUrl = `mock://wechat-pay/${order.id}`;
  }

  const orders = loadOrders();
  orders.push(order);
  saveOrders(orders);
  return order;
}

async function serializeOrder(order, includeQr = false) {
  const result = {
    id: order.id,
    outTradeNo: order.outTradeNo,
    plan: order.plan,
    status: order.status,
    mode: order.mode,
    amountFen: order.amountFen,
    currency: order.currency,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    codeUrl: order.status.startsWith("pending") ? order.codeUrl : "",
    licenseKey: order.licenseKey || "",
  };
  if (includeQr && order.codeUrl) {
    result.qrDataUrl = await QRCode.toDataURL(order.codeUrl, {
      width: 260,
      margin: 1,
      color: { dark: "#1c2430", light: "#ffffff" },
    });
  }
  return result;
}

async function markOrderPaid(order, transaction = {}) {
  if (order.status === "paid" && order.licenseKey) return order;
  const paid = { ...order };
  paid.status = "paid";
  paid.paidAt = new Date().toISOString();
  paid.transactionId = transaction.transaction_id || transaction.transactionId || "";
  paid.tradeState = transaction.trade_state || "SUCCESS";
  paid.licenseKey = createLicense(paid);
  return updateOrder(order.id, () => paid);
}

async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(data));
}

function sendHtml(res, html) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function checkoutHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TokenTotal Pro</title>
  <style>
    body{margin:0;font-family:Inter,system-ui,"Microsoft YaHei",sans-serif;background:#f4f6f1;color:#1c2430}
    main{max-width:760px;margin:0 auto;padding:40px 20px}
    section{background:#fff;border:1px solid #d9dfd4;border-radius:8px;padding:24px;box-shadow:0 8px 24px rgba(31,41,55,.08)}
    h1{margin:0 0 8px;font-size:28px}.muted{color:#667085}.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    input{flex:1;min-width:220px;border:1px solid #d9dfd4;border-radius:8px;padding:11px 12px;font:inherit}
    button{border:0;border-radius:8px;background:#2f8f83;color:white;font-weight:800;padding:11px 16px;cursor:pointer}
    pre{white-space:pre-wrap;word-break:break-all;background:#fbfcfa;border:1px solid #d9dfd4;border-radius:8px;padding:12px}
    .qr{display:grid;place-items:center;min-height:280px;margin:20px 0;border:1px dashed #d9dfd4;border-radius:8px;background:#fbfcfa}
    .qr img{width:260px;height:260px}.hidden{display:none}.warn{color:#b1842d}.ok{color:#2f8f83}
  </style>
</head>
<body>
<main>
  <section>
    <h1>TokenTotal Pro</h1>
    <p class="muted">微信扫码付款后会自动生成 License Key。价格：¥${(PLANS.pro.amountFen / 100).toFixed(2)}</p>
    <div class="row">
      <input id="email" type="email" placeholder="邮箱，用于找回 License" />
      <button id="create">生成微信支付二维码</button>
    </div>
    <p id="status" class="muted"></p>
    <div id="qr" class="qr hidden"></div>
    ${PAYMENT_MODE === "mock" ? '<button id="mockPay" class="hidden">开发模式：模拟支付成功</button>' : ""}
    <div id="licenseBox" class="hidden">
      <p class="ok">付款完成，复制下面的 License Key，回到 TokenTotal 设置页激活。</p>
      <pre id="license"></pre>
    </div>
  </section>
</main>
<script>
let orderId = "";
let timer = null;
const $ = (id) => document.getElementById(id);
async function createOrder() {
  $("status").textContent = "正在创建订单...";
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: "pro", email: $("email").value })
  });
  const data = await res.json();
  if (!res.ok) {
    $("status").textContent = data.error || "创建订单失败";
    $("status").className = "warn";
    return;
  }
  orderId = data.id;
  $("qr").classList.remove("hidden");
  $("qr").innerHTML = '<img alt="微信支付二维码" src="' + data.qrDataUrl + '" />';
  $("status").textContent = data.mode === "mock" ? "开发模式订单已创建。" : "请用微信扫码支付。";
  const mock = $("mockPay");
  if (mock) mock.classList.remove("hidden");
  timer = setInterval(pollOrder, 2000);
}
async function pollOrder() {
  if (!orderId) return;
  const res = await fetch("/api/orders/" + orderId);
  const data = await res.json();
  if (data.status === "paid" && data.licenseKey) {
    clearInterval(timer);
    $("status").textContent = "支付已确认。";
    $("qr").classList.add("hidden");
    $("licenseBox").classList.remove("hidden");
    $("license").textContent = data.licenseKey;
  }
}
async function mockPay() {
  if (!orderId) return;
  await fetch("/api/orders/" + orderId + "/mock-pay", { method: "POST" });
  await pollOrder();
}
$("create").addEventListener("click", createOrder);
const mock = $("mockPay");
if (mock) mock.addEventListener("click", mockPay);
</script>
</body>
</html>`;
}

async function handleWechatNotify(req, res, rawBody) {
  if (!verifyWechatSignature(req.headers, rawBody)) {
    sendJson(res, 401, { code: "FAIL", message: "signature verification failed" });
    return;
  }

  const event = JSON.parse(rawBody);
  const transaction = decryptWechatResource(event.resource);
  const order = findOrder(transaction.out_trade_no);
  if (!order) {
    sendJson(res, 404, { code: "FAIL", message: "order not found" });
    return;
  }
  if (transaction.trade_state === "SUCCESS") {
    await markOrderPaid(order, transaction);
  }
  sendJson(res, 200, { code: "SUCCESS", message: "成功" });
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/checkout")) {
      sendHtml(res, checkoutHtml());
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true, mode: PAYMENT_MODE });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      const payload = JSON.parse((await readBody(req)) || "{}");
      const order = await createOrder(payload);
      sendJson(res, 201, await serializeOrder(order, true));
      return;
    }

    const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (req.method === "GET" && orderMatch) {
      const order = findOrder(orderMatch[1]);
      if (!order) {
        sendJson(res, 404, { error: "Order not found" });
        return;
      }
      sendJson(res, 200, await serializeOrder(order, false));
      return;
    }

    const mockPayMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/mock-pay$/);
    if (req.method === "POST" && mockPayMatch) {
      if (PAYMENT_MODE !== "mock") {
        sendJson(res, 403, { error: "Mock pay is disabled" });
        return;
      }
      const order = findOrder(mockPayMatch[1]);
      if (!order) {
        sendJson(res, 404, { error: "Order not found" });
        return;
      }
      const paid = await markOrderPaid(order, { transaction_id: `mock_${Date.now()}` });
      sendJson(res, 200, await serializeOrder(paid, false));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/wechat/notify") {
      await handleWechatNotify(req, res, await readBody(req));
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

http.createServer(route).listen(PORT, HOST, () => {
  console.log(`TokenTotal payment server: http://${HOST}:${PORT}/checkout`);
  console.log(`Payment mode: ${PAYMENT_MODE}`);
});
