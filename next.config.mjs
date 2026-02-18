/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcrypt", "@prisma/client", "@prisma/adapter-neon"],
};

export default nextConfig;
