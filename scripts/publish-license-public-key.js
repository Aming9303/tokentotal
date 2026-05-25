const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const source = process.env.TOKENTOTAL_LICENSE_PUBLIC_KEY_PATH || path.join(root, ".license", "public.pem");
const target = path.join(root, "license-public.pem");

if (!fs.existsSync(source)) {
  console.error(`Missing public key: ${source}`);
  console.error("Run: npm run license:keys");
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`Public key copied to: ${target}`);
console.log("Rebuild the app after this so packaged users can activate signed Pro licenses.");
