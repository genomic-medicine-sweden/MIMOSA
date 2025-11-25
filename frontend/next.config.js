const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const domain = process.env.DOMAIN || "localhost";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [`${domain}`],
};

module.exports = nextConfig;
