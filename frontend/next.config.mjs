/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack(config, { dev }) {
    if (dev) {
      // Removes the Fast Refresh overlay (red error box)
      config.plugins = config.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ReactRefreshPlugin'
      );
    }
    return config;
  },

  // Optional: fix CORS warning for LAN development
  // allowedDevOrigins: ['http://192.168.29.56'],
};

export default nextConfig;
