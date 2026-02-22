import { defineEventHandler, sendRedirect, setHeader } from 'h3';

export default defineEventHandler((event) => {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && event.node.req.headers['x-forwarded-proto'] !== 'https') {
    const host = event.node.req.headers.host;
    const url = `https://${host}${event.node.req.url}`;
    return sendRedirect(event, url, 301);
  }
  // Set security headers
  setHeader(event, 'Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  setHeader(event, 'Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  setHeader(event, 'X-Frame-Options', 'SAMEORIGIN');
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin');
  setHeader(event, 'Permissions-Policy', 'geolocation=(), microphone=()');
});
