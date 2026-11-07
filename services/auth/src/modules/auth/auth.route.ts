import { Router } from 'express';
import * as controller from './auth.controller.js';
import {
  loginRequest,
  registerRequest,
  verifyEmailRequest,
  resendVerificationRequest,
  updateProfileRequest,
  changePasswordRequest,
} from './auth.validation.js';
import { validateRequest } from '../../middlewares/validate-request.js';
import { authenticateUser } from '../../middlewares/authenticate-user.js';
import { createAuthRateLimit } from '../../middlewares/security.js';

export function authRouter() {
  const router = Router();
  const rateLimit = createAuthRateLimit();

  router.post(
    '/register',
    rateLimit,
    validateRequest(registerRequest, controller.registerUser),
  );

  router.post(
    '/login',
    rateLimit,
    validateRequest(loginRequest, controller.loginUser),
  );

  router.post(
    '/verify-email',
    rateLimit,
    authenticateUser,
    validateRequest(verifyEmailRequest, controller.verifyEmail),
  );

  router.post(
    '/resend-code',
    rateLimit,
    authenticateUser,
    validateRequest(resendVerificationRequest, controller.resendVerificationEmail),
  );

  // Alias for backward compatibility
  router.post(
    '/resend-verification',
    rateLimit,
    authenticateUser,
    validateRequest(resendVerificationRequest, controller.resendVerificationEmail),
  );

  router.post('/logout', controller.logoutUser);

  router.get('/me', authenticateUser, controller.getCurrentUser);

  router.patch(
    '/profile',
    authenticateUser,
    validateRequest(updateProfileRequest, controller.updateProfile),
  );

  router.post(
    '/change-password',
    rateLimit,
    authenticateUser,
    validateRequest(changePasswordRequest, controller.changePassword),
  );

  return router;
}

