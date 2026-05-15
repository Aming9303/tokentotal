const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const defaultPrivateKeyPath = path.join(root, ".license", "private.pem");
const privateKeyPath = process.env.TOKENTOTAL_LICENSE_PRIVATE_KEY_PATH || defaultPrivateKeyPath;

const PRO_FEATURES = [
  "connectors",
  "localChat",
  "promptEnglish",
  "cloudUsage",
  "exportData",
  "unlimitedHistory",
];

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1] || fallback;
  return fallback;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
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

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Missing private key: ${privateKeyPath}`);
  console.error("Run: npm run license:keys");
  process.exit(1);
}

const email = arg("email");
const customerName = arg("name");
const expiresAt = arg("expires");
const orderId = arg("order", randomId("manual"));
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const payload = {
  product: "tokentotal",
  plan: arg("plan", "pro"),
  licenseId: randomId("lic"),
  email,
  customerName,
  orderId,
  issuedAt: new Date().toISOString(),
  features: PRO_FEATURES,
};

if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();

const payloadPart = base64Url(JSON.stringify(payload));
const signaturePart = base64Url(signPayload(payloadPart, privateKey));
const licenseKey = `TT-PRO-${payloadPart}.${signaturePart}`;

console.log(licenseKey);
