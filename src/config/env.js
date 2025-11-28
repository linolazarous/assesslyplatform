// src/config/env.js
const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com',
  API_V1_BASE: `${(import.meta.env.VITE_API_BASE_URL || 'https://assesslyplatform-t49h.onrender.com').replace(/\/+$/, '')}/api/v1`,
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Assessly',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
};

console.log('🔧 Environment Config:', config);
export default config;
