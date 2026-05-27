/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent browsers from MIME-sniffing the content-type
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Disallow embedding in iframes on other origins (clickjacking protection)
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Enable browser XSS filtering (legacy browsers)
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Control referrer information sent with requests
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Restrict access to browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Force HTTPS for 1 year (enable only when you have a confirmed HTTPS deployment)
  // Uncomment in production after verifying HTTPS is stable:
  // {
  //   key: "Strict-Transport-Security",
  //   value: "max-age=31536000; includeSubDomains; preload",
  // },
  // Content Security Policy — tightened for this app's actual needs
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts + React hydration require 'unsafe-inline' and 'unsafe-eval' in dev.
      // In production you can replace these with nonces via middleware.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Allow images from self, data URIs (base64 wireframes), and Unsplash
      "img-src 'self' data: blob: https://images.unsplash.com",
      // Allow connections back to self and the Agent5i webhook hosts
      "connect-src 'self' https://agent5i.c5ailabs.com https://agent5idev.c5ailabs.com",
      "font-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
