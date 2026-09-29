/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  allowedDevOrigins: ["host.docker.internal"],
  output: 'export'
};

export default nextConfig;
