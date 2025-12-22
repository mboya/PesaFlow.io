import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true, // Temporarily disabled to debug refresh loop
  
  reactStrictMode: true,
  
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Reduce file watching sensitivity in Docker
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after first change
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default nextConfig;
