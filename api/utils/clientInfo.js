// src/api/utils/clientInfo.js
import uaParser from 'ua-parser-js';
import geoip from 'geoip-lite';

export function getClientIp(req) {
  return req.ip ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}

export function getClientInfo(req) {
  const ip = getClientIp(req);
  const userAgent = req.get('User-Agent') || '';
  const referrer = req.get('Referer') || '';
  const origin = req.get('Origin') || '';
  const parser = new uaParser(userAgent);
  const uaResult = parser.getResult();
  const geo = geoip.lookup(ip) || {};

  return {
    ip,
    userAgent,
    referrer,
    origin,
    device: {
      type: uaResult.device.type || 'desktop',
      model: uaResult.device.model || uaResult.device.vendor || 'Unknown',
      os: uaResult.os || {},
    },
    browser: uaResult.browser || {},
    location: {
      country: geo?.country || '',
      region: geo?.region || '',
      city: geo?.city || '',
      ll: geo?.ll || null
    },
  };
}
