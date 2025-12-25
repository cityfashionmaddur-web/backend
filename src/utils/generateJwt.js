import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export function generateJwt(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });
}
