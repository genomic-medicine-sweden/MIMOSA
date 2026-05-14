const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const domain = process.env.DOMAIN || "localhost";
const basePath = process.env.MIMOSA_RELATIVE_URL_BASE || "";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [`${domain}`],
  basePath,
  assetPrefix: basePath,
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
