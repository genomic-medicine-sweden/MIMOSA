const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const domain = process.env.DOMAIN || "localhost";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [`${domain}`],
  webpack: (config) => {
    config.resolve.alias["@shared"] = path.resolve(__dirname, "../shared");
    return config;
  },
};

module.exports = nextConfig;
