import { OAuth2Client } from 'google-auth-library';
import { ENV } from '../config/env.js';
import { prisma } from '../config/prismaClient.js';
import { generateJwt } from '../utils/generateJwt.js';

const googleClient = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

function authError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function buildAuthResponse(user) {
  return {
    token: generateJwt(user),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      profilePicture: user.profilePicture,
      role: user.role,
    },
  };
}

async function upsertGoogleUser(payload) {
  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name || email;
  const picture = payload.picture || null;

  if (!email) {
    throw authError('Email is required from Google');
  }

  return prisma.user.upsert({
    where: { googleId },
    update: {
      email,
      name,
      profilePicture: picture,
    },
    create: {
      googleId,
      email,
      name,
      profilePicture: picture,
      // role: 'CUSTOMER' by default from schema
    },
  });
}

export async function exchangeGoogleIdToken(idToken) {
  if (!idToken) {
    throw authError('idToken is required');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: ENV.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw authError('Invalid Google token');
  }

  const user = await upsertGoogleUser(payload);
  return buildAuthResponse(user);
}

export async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    const auth = await exchangeGoogleIdToken(idToken);
    return res.json(auth);
  } catch (err) {
    console.error('Google login error:', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Auth failed' });
  }
}
