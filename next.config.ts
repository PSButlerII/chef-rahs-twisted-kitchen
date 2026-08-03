import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const squareCspMode =
  process.env.SQUARE_ENVIRONMENT === "production" &&
  process.env.SQUARE_CSP_MODE === "production"
    ? "production"
    : "sandbox";
const squareSdkOrigin =
  squareCspMode === "production"
    ? "https://web.squarecdn.com"
    : "https://sandbox.web.squarecdn.com";
const squarePciOrigin =
  squareCspMode === "production"
    ? "https://pci-connect.squareup.com"
    : "https://pci-connect.squareupsandbox.com";
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  squareSdkOrigin,
  "https://pay.google.com",
].join(" ");

const securityHeaders = [
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: `camera=(), microphone=(), geolocation=(), payment=(self "${squareSdkOrigin}"), usb=(), interest-cohort=()`,
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy",
    value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'; script-src ${scriptSources}; frame-src ${squareSdkOrigin}; connect-src 'self' ${squareSdkOrigin} ${squarePciOrigin} https://o160250.ingest.sentry.io; style-src 'self' 'unsafe-inline' ${squareSdkOrigin}; font-src 'self' https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net https://cash-f.squarecdn.com; img-src 'self' data: https:`,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
