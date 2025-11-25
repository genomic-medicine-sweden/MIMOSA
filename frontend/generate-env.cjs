const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { DOMAIN, BACKEND_PORT, BONSAI_PORT } = process.env;

if (!DOMAIN || !BACKEND_PORT || !BONSAI_PORT) {
  console.error(
    "Missing environment variables.\n" +
      "Please ensure DOMAIN, BACKEND_PORT, and BONSAI_PORT are defined in your .env file.",
  );
  process.exit(1);
}

const content =
  [
    `NEXT_PUBLIC_API_URL=http://${DOMAIN}:${BACKEND_PORT}`,
    `NEXT_PUBLIC_BONSAI_URL=http://${DOMAIN}:${BONSAI_PORT}`,
  ].join("\n") + "\n";

const envLocalPath = path.resolve(__dirname, ".env.local");

try {
  fs.writeFileSync(envLocalPath, content);
} catch (err) {
  console.error(`Failed to write .env.local: ${err.message}`);
  process.exit(1);
}
