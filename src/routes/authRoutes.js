import { Router } from 'express';
import { googleLogin } from '../controllers/authController.js';
import { googleOAuthRedirect, googleOAuthCallback } from '../controllers/googleOAuthController.js';

const router = Router();

// POST /auth/google
router.post('/google', googleLogin);
// GET /auth/google/redirect
router.get('/google/redirect', googleOAuthRedirect);
// GET /auth/google/callback
router.get('/google/callback', googleOAuthCallback);

export default router;
