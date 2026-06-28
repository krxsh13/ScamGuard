import { z } from 'zod';

// Email validation pattern
const emailPattern = /^\S+@\S+\.\S+$/;

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
}).strict();

export const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
}).strict();

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
}).strict();
