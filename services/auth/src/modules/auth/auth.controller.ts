import type { Request, Response } from 'express';
import type { z } from 'zod';
import * as service from './auth.service.js';
import { setSessionCookie, clearSessionCookie } from './auth.session.js';
import type {
  loginRequest,
  registerRequest,
  verifyEmailRequest,
  updateProfileRequest,
  changePasswordRequest,
} from './auth.validation.js';
import { sendSuccess } from '../../utils/response.js';
import { requireUser } from '../../middlewares/authenticate-user.js';
import { getUserById } from '../users/user.service.js';

export async function registerUser(
  _request: Request,
  response: Response,
  input: z.output<typeof registerRequest>,
) {
  const user = await service.registerUser(input.body);
  setSessionCookie(response, user);
  return sendSuccess(
    response,
    user,
    'Check your email for a verification code',
    201,
  );
}

export async function loginUser(
  _request: Request,
  response: Response,
  input: z.output<typeof loginRequest>,
) {
  const user = await service.loginUser(input.body);
  setSessionCookie(response, user);
  return sendSuccess(response, user, 'Logged in successfully');
}

export function logoutUser(_request: Request, response: Response) {
  clearSessionCookie(response);
  return sendSuccess(response, null, 'Logged out successfully');
}

export async function getCurrentUser(request: Request, response: Response) {
  return sendSuccess(
    response,
    await getUserById(requireUser(request).id),
    'Current user retrieved successfully',
  );
}

export async function verifyEmail(
  request: Request,
  response: Response,
  input: z.output<typeof verifyEmailRequest>,
) {
  const user = await service.verifyEmail(
    requireUser(request).id,
    input.body.code,
  );
  setSessionCookie(response, user);
  return sendSuccess(response, user, 'Email verified successfully');
}

export async function resendVerificationEmail(
  request: Request,
  response: Response,
) {
  await service.resendVerificationEmail(requireUser(request).id);
  return sendSuccess(
    response,
    null,
    'Verification code sent. Check your email.',
  );
}

export async function updateProfile(
  request: Request,
  response: Response,
  input: z.output<typeof updateProfileRequest>,
) {
  const userId = requireUser(request).id;
  const user = await service.updateProfile(userId, input.body);
  setSessionCookie(response, user);
  return sendSuccess(response, user, 'Profile updated successfully');
}

export async function changePassword(
  request: Request,
  response: Response,
  input: z.output<typeof changePasswordRequest>,
) {
  const userId = requireUser(request).id;
  const result = await service.changePassword(userId, input.body);
  return sendSuccess(response, result, 'Password changed successfully');
}


