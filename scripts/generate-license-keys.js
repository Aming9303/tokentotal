const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const outDir = path.join(root, ".license");
const privatePath = path.join(outDir, "private.pem");
const publicPath = path.join(outDir, "public.pem");
const force = process.argv.includes("--force");

if (!force && (fs.existsSync(privatePath) || fs.existsSync(publicPath))) {
  console.error("License keys already exist. Use --force only if you really want to replace them.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });
const publicPem = publicKey.export({ type: "spki", format: "pem" });

fs.writeFileSync(privatePath, privatePem, { encoding: "utf8", mode: 0o600 });
fs.writeFileSync(publicPath, publicPem, "utf8");

console.log(`Private key: ${privatePath}`);
console.log(`Public key:  ${publicPath}`);
console.log("");
console.log("Keep private.pem secret. Put public.pem into the app runtime as:");
console.log(`$env:TOKENTOTAL_LICENSE_PUBLIC_KEY_PATH="${publicPath}"`);
