/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const certPath = path.resolve(__dirname, '../../certs/dev.pem');
const keyPath = path.resolve(__dirname, '../../certs/dev-key.pem');

const https = fs.existsSync(certPath) && fs.existsSync(keyPath)
  ? { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
  : undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    https,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});