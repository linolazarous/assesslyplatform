import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // You can add more configurations here, like proxy rules for API calls
  server: {
    proxy: {
      '/api': 'http://localhost:3000' // Example proxy for your Vercel functions
    }
  }
});
