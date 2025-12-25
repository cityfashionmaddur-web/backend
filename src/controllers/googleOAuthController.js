import { ENV } from '../config/env.js';
import { createGoogleOAuthClient } from '../config/googleOAuth.js';
import { exchangeGoogleIdToken } from './authController.js';

const DEFAULT_FRONTEND = (ENV.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const DEFAULT_REDIRECT = `${DEFAULT_FRONTEND}/oauth/callback`;

function encodeState(data) {
  const json = JSON.stringify(data);
  return Buffer.from(json)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeState(state) {
  if (!state) return {};
  try {
    const normalized = state.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (err) {
    return {};
  }
}

function resolveRedirect(requested) {
  if (!requested) return DEFAULT_REDIRECT;
  if (requested.startsWith(DEFAULT_FRONTEND)) return requested;
  return DEFAULT_REDIRECT;
}

export function googleOAuthRedirect(req, res) {
  try {
    const client = createGoogleOAuthClient();
    const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : '';
    const state = redirect ? encodeState({ redirect }) : undefined;

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      prompt: 'consent',
      state,
    });

    res.redirect(authUrl);
  } catch (err) {
    console.error('Google OAuth redirect error:', err);
    res.status(500).send('Failed to initiate Google OAuth');
  }
}

export async function googleOAuthCallback(req, res) {
  const code = req.query.code;
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const { redirect } = decodeState(state);
  const redirectTarget = resolveRedirect(redirect);

  if (!code) {
    const url = new URL(redirectTarget);
    url.searchParams.set('error', 'missing_code');
    return res.redirect(url.toString());
  }

  try {
    const client = createGoogleOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens?.id_token) {
      throw new Error('Missing id_token in Google response');
    }

    const auth = await exchangeGoogleIdToken(tokens.id_token);
    const url = new URL(redirectTarget);
    url.searchParams.set('token', auth.token);
    return res.redirect(url.toString());
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    const url = new URL(redirectTarget);
    url.searchParams.set('error', 'oauth_failed');
    return res.redirect(url.toString());
  }
}
