import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// --- FIX START: Manually define __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- FIX END ---

// Load .env from the root (../../ from this file)
const result = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Optional: specific error logging to help debug
if (result.error) {
  console.log("⚠️  .env file not found at:", path.resolve(__dirname, '../../.env'));
}

export const ENV = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ADMIN_USER_ID: process.env.ADMIN_USER_ID,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
};