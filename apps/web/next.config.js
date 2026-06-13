/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Prisma must not be webpack-bundled (breaks model delegates → undefined.findMany). */
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Allow importing workspace packages that ship raw TS.
  transpilePackages: [
    "@monana/db",
    "@monana/types",
    "@monana/utils",
    "@monana/i18n",
    "@monana/bot-content",
    "@monana/orders",
    "@monana/payment",
    "@monana/notifications",
    "@monana/grocery",
    "@monana/restaurant",
    "@monana/admin",
    "@monana/settings",
    "@monana/users",
    "@monana/hot-products",
  ],
};

module.exports = nextConfig;
