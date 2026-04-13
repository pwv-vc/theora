import { secureHeaders } from 'hono/secure-headers'

export const webSecurityHeaders = secureHeaders({
  // Local `theora serve` is HTTP-only; HSTS would tell browsers to use HTTPS and breaks LAN QR links.
  strictTransportSecurity: false,
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      'https://unpkg.com',
      'https://cdn.jsdelivr.net',
      "'unsafe-inline'",
    ],
    styleSrc: ["'self'", "'unsafe-inline'"],
    fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
})
