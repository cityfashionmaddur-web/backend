import { OAuth2Client } from 'google-auth-library';
import { ENV } from './env.js';

export function createGoogleOAuthClient(tokens = null) {
  const missing = [];
  if (!ENV.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!ENV.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!ENV.GOOGLE_REDIRECT_URI) missing.push('GOOGLE_REDIRECT_URI');

  if (missing.length) {
    throw new Error(`Missing Google OAuth env vars: ${missing.join(', ')}`);
  }

  const client = new OAuth2Client(
    ENV.GOOGLE_CLIENT_ID,
    ENV.GOOGLE_CLIENT_SECRET,
    ENV.GOOGLE_REDIRECT_URI
  );

  if (tokens) {
    client.setCredentials(tokens);
  }

  return client;
}
