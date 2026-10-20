/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Pages without an explicit `instant` export are validated as `instant = true` by default, and `instant = false`
  // on the (app) layout does NOT cover its child pages. Every page here reads the session + DB (never static), so only
  // validate segments that opt in explicitly.
  experimental: { instantInsights: { validationLevel: "manual-warning" } },
  // Native / driver packages must not be bundled.
  serverExternalPackages: ["@node-rs/argon2", "pg", "@prisma/client", "@prisma/adapter-pg"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
